// backend/controllers/paymentController.js
// Full, self-contained payment controller used by paymentRoutes.
// Adjust model requires if your filenames differ.

const Payment = require('../models/Payment');
const Contribution = require('../models/contributionModel'); // adjust path/name if needed
const Notification = require('../models/Notification');
const User = require('../models/User');
const ChitScheme = require('../models/ChitScheme');

/**
 * Create a payment record (status: pending)
 * POST /api/payments/:chitId
 */
exports.createPayment = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    const chitId = req.params.chitId;
    const { amount, month, year, note } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!chitId || !amount) return res.status(400).json({ message: 'chitId and amount required' });

    // ensure chit exists
    const chit = await ChitScheme.findById(chitId).lean();
    if (!chit) return res.status(404).json({ message: 'Chit not found' });

    const payment = await Payment.create({
      userId,
      chitId,
      amount,
      month,
      year,
      note,
      status: 'pending'
    });

    // Provide optional UPI metadata (can be null)
    const upi = {
      upiId: process.env.DEFAULT_UPI_ID || null,
      payeeName: process.env.DEFAULT_PAYEE_NAME || null
    };

    return res.status(201).json({ success: true, payment, upi });
  } catch (err) {
    next(err);
  }
};

/**
 * Get a payment by id
 * GET /api/payments/:id
 */
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('chitId', 'name')
      .populate('userId', 'name email');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ payment });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all payments for current user
 * GET /api/payments/user
 */
exports.getUserPayments = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) return res.status(401).json({ message: 'Unauthorized' });
    const payments = await Payment.find({ userId: req.user._id })
      .populate('chitId', 'name')
      .sort({ createdAt: -1 });
    res.json({ payments });
  } catch (err) {
    next(err);
  }
};

/**
 * User requests verification after making payment
 * PATCH /api/payments/:id/request-verification
 */
exports.requestVerification = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Only owner or admin can request verification
    if (String(payment.userId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: `Cannot request verification for status ${payment.status}` });
    }

    payment.status = 'verification_requested';
    await payment.save();

    // Optional: notify admins (not implemented here)
    res.json({ success: true, payment });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: list verification requests
 * GET /api/payments/admin/verification-requests
 */
exports.getVerificationRequests = async (req, res, next) => {
  try {
    const items = await Payment.find({ status: 'verification_requested' })
      .populate('userId', 'name email')
      .populate('chitId', 'name')
      .sort({ createdAt: 1 });
    res.json({ payments: items });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin approves a payment: set paid + create Contribution record
 * PATCH /api/payments/admin/:id/approve
 */
exports.adminApprovePayment = async (req, res, next) => {
  try {
    const id = req.params.id;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (payment.status !== 'verification_requested') {
      return res.status(400).json({ message: `Cannot approve payment with status ${payment.status}` });
    }

    // mark payment as paid
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    // Populate chit info for message + contribution
    const chit = await ChitScheme.findById(payment.chitId).lean();

    // Create contribution record (fields depend on your contributionModel)
    // Adjust these keys to match your contribution schema exactly.
    const contributionPayload = {
      userId: payment.userId,
      chitId: payment.chitId,
      amount: payment.amount,
      month: payment.month || null,
      year: payment.year || null,
      paidDate: payment.paidAt,
      paymentId: payment._id
    };

    let contribution = null;
    try {
      contribution = await Contribution.create(contributionPayload);
    } catch (cErr) {
      console.error('Failed to create contribution record on approve:', cErr);
      // still continue — payment is marked as paid, but contribution missing is bad for UI
    }

    // Create notification for the user
    try {
      await Notification.create({
        userId: payment.userId,
        title: 'Payment approved',
        message: `Your payment for "${chit?.name || 'chit'}" has been approved.`,
        link: '/contribution-history',
        createdAt: new Date()
      });
    } catch (nErr) {
      console.warn('Notification creation failed:', nErr);
    }

    // Return the updated payment and created contribution to admin client
    const populatedPayment = await Payment.findById(payment._id).populate('chitId', 'name');
    res.json({ success: true, payment: populatedPayment, contribution });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin rejects a payment
 * PATCH /api/payments/admin/:id/reject
 */
exports.adminRejectPayment = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { reason } = req.body;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (payment.status !== 'verification_requested') {
      return res.status(400).json({ message: `Cannot reject payment with status ${payment.status}` });
    }

    payment.status = 'rejected';
    payment.rejectionReason = reason || 'Rejected by admin';
    await payment.save();

    try {
      await Notification.create({
        userId: payment.userId,
        title: 'Payment rejected',
        message: `Your payment was rejected: ${payment.rejectionReason}`,
        link: '/payments',
        createdAt: new Date()
      });
    } catch (nErr) {
      console.warn('Failed to create notification', nErr);
    }

    res.json({ success: true, payment });
  } catch (err) {
    next(err);
  }
};
