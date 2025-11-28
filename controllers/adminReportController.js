// backend/controllers/adminReportController.js
const mongoose = require('mongoose');
const ChitScheme = require('../models/ChitScheme');
const Contribution = require('../models/contributionModel');
let Payment;
try {
  Payment = require('../models/Payment');
} catch (e) {
  try { Payment = require('../models/paymentModel'); } catch (e2) { Payment = null; }
}

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * GET /api/admin/reports
 * Query params: q, status, from, to, sortBy, sortDir, page, pageSize
 *
 * Aggregation returns:
 * {
 *   rows: [ { chitId, chitName, totalMembers, totalAmount, collectedAmount, pendingAmount, pendingPaymentsCount, finalWallet, distributedAmount, released: {...} } ],
 *   total,
 *   summary: { totalChits, totalMembers, totalCollected, totalPending, totalWallet, pendingPayments }
 * }
 */
exports.getAdminReports = async (req, res, next) => {
  try {
    const {
      q,
      status,
      from,
      to,
      sortBy = 'collectedAmount',
      sortDir = 'desc',
      page = 1,
      pageSize = 25
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.max(1, parseInt(pageSize, 10) || 25);
    const skip = (pageNum - 1) * limit;
    const sortDirection = sortDir === 'asc' ? 1 : -1;

    // Build match
    const match = {};
    if (q) {
      const qRegex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match.$or = [{ name: { $regex: qRegex } }, { description: { $regex: qRegex } }];
      if (mongoose.Types.ObjectId.isValid(q)) match.$or.push({ _id: mongoose.Types.ObjectId(q) });
    }
    if (from || to) {
      match.startDate = {};
      if (from) match.startDate.$gte = new Date(from);
      if (to) match.startDate.$lte = new Date(to);
    }

    const contribCollName = (Contribution && Contribution.collection && Contribution.collection.name) ? Contribution.collection.name : 'contributions';
    const paymentCollName = Payment && Payment.collection && Payment.collection.name ? Payment.collection.name : 'payments';

    // Pipeline:
    const pipeline = [
      { $match: match },

      // lookup collected (paid contributions) sum
      {
        $lookup: {
          from: contribCollName,
          let: { chitId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$chitId', '$$chitId'] }, { $eq: ['$status', 'paid'] }] } } },
            { $group: { _id: null, totalCollected: { $sum: '$amount' } } }
          ],
          as: 'collected'
        }
      },

      // lookup pending payments count (payments requiring action)
      {
        $lookup: {
          from: paymentCollName,
          let: { chitId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$chitId', '$$chitId'] },
                    { $in: ['$status', ['verification_requested', 'pending', 'verification_pending']] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          as: 'pendingPayments'
        }
      },

      // compute core fields; use stored totalAmount if present (totalAmount), else amount field
      {
        $addFields: {
          collectedAmount: { $ifNull: [{ $arrayElemAt: ['$collected.totalCollected', 0] }, 0] },
          pendingPaymentsCount: { $ifNull: [{ $arrayElemAt: ['$pendingPayments.count', 0] }, 0] },
          totalMembers: { $ifNull: ['$totalMembers', 0] },
          totalAmount: {
            $ifNull: [
              '$totalAmount',
              { $ifNull: ['$amount', 0] } // do NOT multiply by members — total amount must come from backend
            ]
          }
        }
      },

      // If admin has already released and stored values under `released`, use them.
      // finalWallet = released.fwa (if exists) else compute GWB->commission->FWA fallback
      {
        $addFields: {
          // distributedAmount = GWB i.e., totalAmount - rca (if released.rca present) else (totalAmount - (released.walletAmount || 0)) fallback
          released_rca: '$released.rca',
          released_gwb: '$released.gwb',
          released_commission: '$released.commission',
          released_fwa: '$released.fwa',
          released_walletAmount: '$released.walletAmount',
        }
      },

      {
        $addFields: {
          // compute GWB fallback if not stored
          _computedGWB: {
            $cond: [
              { $ifNull: ['$released_gwb', false] },
              '$released_gwb',
              {
                $max: [
                  0,
                  { $subtract: ['$totalAmount', { $ifNull: ['$released_rca', 0] }] }
                ]
              }
            ]
          },
          _computedCommission: {
            $cond: [
              { $ifNull: ['$released_commission', false] },
              '$released_commission',
              { $multiply: [0.05, {
                $cond: [
                  { $ifNull: ['$released_gwb', false] },
                  '$released_gwb',
                  { $max: [0, { $subtract: ['$totalAmount', { $ifNull: ['$released_rca', 0] }] }] }
                ]
              }] }
            ]
          },
          // final wallet after commission fallback
          finalWallet: {
            $cond: [
              { $ifNull: ['$released_fwa', false] },
              '$released_fwa',
              {
                $max: [
                  0,
                  {
                    $subtract: [
                      {
                        $cond: [
                          { $ifNull: ['$released_gwb', false] },
                          '$released_gwb',
                          { $max: [0, { $subtract: ['$totalAmount', { $ifNull: ['$released_rca', 0] }] }] }
                        ]
                      },
                      {
                        $multiply: [
                          0.05,
                          {
                            $cond: [
                              { $ifNull: ['$released_gwb', false] },
                              '$released_gwb',
                              { $max: [0, { $subtract: ['$totalAmount', { $ifNull: ['$released_rca', 0] }] }] }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          // distributedAmount: amount to be distributed to members (GWB before commission)
          distributedAmount: {
            $cond: [
              { $ifNull: ['$released_gwb', false] },
              '$released_gwb',
              { $max: [0, { $subtract: ['$totalAmount', { $ifNull: ['$released_rca', 0] }] }] }
            ]
          }
        }
      },

      // project fields we want
      {
        $project: {
          chitId: '$_id',
          chitName: '$name',
          totalMembers: 1,
          totalAmount: 1,
          collectedAmount: 1,
          pendingAmount: { $max: [0, { $subtract: ['$totalAmount', '$collectedAmount'] }] },
          pendingPaymentsCount: 1,
          finalWallet: 1,
          distributedAmount: 1,
          released: 1,
          createdAt: 1,
          startDate: 1
        }
      },

      // Sorting
      { $sort: { [sortBy]: sortDirection, chitName: 1 } },

      // Facet for pagination
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      },

      {
        $project: {
          rows: '$data',
          total: { $ifNull: [{ $arrayElemAt: ['$metadata.total', 0] }, 0] }
        }
      }
    ];

    const agg = await ChitScheme.aggregate(pipeline).allowDiskUse(true);
    const out = (agg && agg[0]) ? agg[0] : { rows: [], total: 0 };

    // Lightweight global summary aggregation (accurate across all matching chits)
    const summaryPipeline = [
      { $match: match },
      {
        $lookup: {
          from: contribCollName,
          let: { chitId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$chitId', '$$chitId'] }, { $eq: ['$status', 'paid'] }] } } },
            { $group: { _id: null, totalCollected: { $sum: '$amount' } } }
          ],
          as: 'collected'
        }
      },
      {
        $addFields: {
          collectedAmount: { $ifNull: [{ $arrayElemAt: ['$collected.totalCollected', 0] }, 0] },
          totalAmount: { $ifNull: ['$totalAmount', { $ifNull: ['$amount', 0] }] },
          released_gwb: '$released.gwb',
          released_fwa: '$released.fwa',
          released_rca: '$released.rca'
        }
      },
      {
        $addFields: {
          computedGWB: {
            $cond: [
              { $ifNull: ['$released_gwb', false] },
              '$released_gwb',
              { $max: [0, { $subtract: ['$totalAmount', { $ifNull: ['$released_rca', 0] }] }] }
            ]
          },
          computedFWA: {
            $cond: [
              { $ifNull: ['$released.fwa', false] },
              '$released.fwa',
              {
                $let: {
                  vars: {
                    gwb: {
                      $cond: [
                        { $ifNull: ['$released_gwb', false] },
                        '$released_gwb',
                        { $max: [0, { $subtract: ['$totalAmount', { $ifNull: ['$released_rca', 0] }] }] }
                      ]
                    }
                  },
                  in: { $subtract: ['$$gwb', { $multiply: [0.05, '$$gwb'] }] }
                }
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalChits: { $sum: 1 },
          totalMembers: { $sum: { $ifNull: ['$totalMembers', 0] } },
          totalCollected: { $sum: '$collectedAmount' },
          totalAmountSum: { $sum: '$totalAmount' },
          totalWallet: { $sum: { $ifNull: ['$computedFWA', 0] } }
        }
      }
    ];

    const summaryAgg = await ChitScheme.aggregate(summaryPipeline).allowDiskUse(true);
    const summaryRes = summaryAgg && summaryAgg[0] ? summaryAgg[0] : {
      totalChits: 0,
      totalMembers: 0,
      totalCollected: 0,
      totalAmountSum: 0,
      totalWallet: 0
    };

    const totalPending = Math.max(0, (summaryRes.totalAmountSum || 0) - (summaryRes.totalCollected || 0));

    res.json({
      rows: out.rows || [],
      total: out.total || 0,
      summary: {
        totalChits: summaryRes.totalChits || 0,
        totalMembers: summaryRes.totalMembers || 0,
        totalCollected: summaryRes.totalCollected || 0,
        totalPending,
        totalWallet: summaryRes.totalWallet || 0,
        pendingPayments: out.rows ? out.rows.reduce((s, r) => s + (r.pendingPaymentsCount || 0), 0) : 0
      }
    });
  } catch (err) {
    console.error('getAdminReports error', err);
    next(err);
  }
};
