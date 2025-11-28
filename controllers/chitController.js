const ChitScheme = require('../models/ChitScheme');
const User = require('../models/User');
const JoinRequest = require('../models/JoinRequest');
const Notification = require('../models/Notification');
const Contribution = require('../models/contributionModel');
const mongoose = require('mongoose');


// createChitScheme - creates a new chit and creates notifications for all users
exports.createChitScheme = async (req, res, next) => {
  try {
    const {
      name,
      amount,
      totalMembers,
      durationInMonths,
      startDate,
      description
    } = req.body;

    if (!name || !amount || !totalMembers || !durationInMonths) {
      res.status(400);
      return next(new Error('name, amount, totalMembers and durationInMonths are required'));
    }

    const chit = await ChitScheme.create({
      name,
      amount,
      totalMembers,
      durationInMonths,
      startDate: startDate ? new Date(startDate) : undefined,
      description,
      createdBy: req.user ? req.user._id : undefined,
    });

    // Respond to client immediately
    res.status(201).json({ success: true, chit });

    // Create notifications for all users (fire-and-forget but robust)
    (async () => {
      try {
        const users = await User.find({}, '_id').lean();
        if (!users || users.length === 0) return;

        const now = new Date();
        const chitLink = `/join-chit/${chit._id}`; // frontend route, adjust if needed

        // Build notifications array with required fields (title, message, link, read)
        const notifications = users.map((u) => ({
          userId: u._id,
          title: 'New Chit Scheme Added',
          message: `New chit scheme "${chit.name}" added — Amount: ₹${chit.amount}.`,
          link: chitLink,
          read: false,
          createdAt: now
        }));

        // Bulk insert (unordered) to avoid a single failure stopping all inserts
        await Notification.insertMany(notifications, { ordered: false });
      } catch (notifErr) {
        // log error but don't throw (we already responded)
        console.error('Failed to create notifications for new chit:', notifErr);
        // Optional: more detailed logging of notifErr.writeErrors if needed
      }
    })();
  } catch (err) {
    next(err);
  }
};

exports.joinChitScheme = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const chitId = req.params.id;

    if (!chitId) {
      res.status(400);
      return next(new Error('Chit id is required'));
    }

    const chit = await ChitScheme.findById(chitId);
    if (!chit) {
      res.status(404);
      return next(new Error('Chit not found'));
    }

    // Prevent creating request if already a member
    const alreadyMember = (chit.currentMembers && chit.currentMembers.some(m => m.toString() === userId.toString()))
      || (chit.joinedUsers && chit.joinedUsers.some(u => {
        if (!u) return false;
        if (typeof u === 'object' && u.user) return u.user.toString() === userId.toString() && u.isApproved;
        return u.toString() === userId.toString();
      }));

    if (alreadyMember) {
      return res.status(400).json({ message: 'User already a member of this chit' });
    }

    // Prevent duplicate pending request
    const existing = await JoinRequest.findOne({ userId, chitId, status: 'pending' });
    if (existing) {
      return res.status(200).json({ message: 'Join request already pending', request: existing });
    }

    // Create a pending join request
    const jr = await JoinRequest.create({ userId, chitId });
    return res.status(201).json({ success: true, message: 'Join request created', request: jr });
  } catch (err) {
    next(err);
  }
};

// Get all schemes
exports.getAllChitSchemes = async (req, res) => {
  try {
    const schemes = await ChitScheme.find()
      .populate('joinedUsers.user', 'isApproved name email'); // populate user info & approval
    res.status(200).json(schemes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.getJoinedSchemes = async (req, res) => {
  const userId = req.user._id;

  try {
    const joinedSchemes = await ChitScheme.find({ 'joinedUsers.user': userId })
      .populate('joinedUsers.user', 'name email isApproved');

    res.status(200).json(joinedSchemes);
  } catch (err) {
    console.error('Error fetching joined schemes:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createChit = async (req, res) => {
  try {
    const { name, totalAmount, members, duration, startDate } = req.body;

    const chit = new Chit({
      name,
      totalAmount,
      members,
      duration,
      startDate,
    });

    await chit.save();
    res.status(201).json({ success: true, message: 'Chit created successfully', chit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error while creating chit' });
  }
};


exports.getAllChits = async (req, res) => {
  try {
    const chits = await Chit.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, chits });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching chits' });
  }
};
exports.updateScheme = async (req, res) => {
  const { id } = req.params;
  const updated = await ChitScheme.findByIdAndUpdate(id, req.body, { new: true });
  res.json(updated);
};

exports.deleteScheme = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ChitScheme.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Scheme not found' });
    }

    res.status(200).json({ message: 'Scheme deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getChitById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const chit = await ChitScheme.findById(id)
      .populate('joinedUsers.user', 'name email') // if joinedUsers has subdocs
      .lean();

    if (!chit) return res.status(404).json({ message: 'Chit not found' });

    // compute collected amount by summing contributions for this chit (only approved paid ones)
    const agg = await Contribution.aggregate([
      { $match: { chitId: chit._id } },
      { $group: { _id: '$chitId', total: { $sum: '$amount' } } }
    ]);

    const collectedAmount = (agg[0] && agg[0].total) ? agg[0].total : 0;
    const totalAmount = chit.totalAmount ;

    res.json({
      chit: {
        ...chit,
        collectedAmount,
        totalAmount
      }
    });
  } catch (err) {
    next(err);
  }
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * PATCH /api/chit/:id/release
 * Body: { bidAmount: Number, walletAmount?: Number }
 * Protected: adminOnly
 *
 * Stores computed wallet/commission details on the chit document under `released`.
 */
exports.releaseChit = async (req, res, next) => {
  try {
    const chitId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(chitId)) {
      res.status(400);
      return next(new Error('Invalid chit id'));
    }

    const { bidAmount = 0, walletAmount } = req.body;

    const chit = await ChitScheme.findById(chitId);
    if (!chit) {
      res.status(404);
      return next(new Error('Chit not found'));
    }

    // Determine TCV (Total Chit Value) - prefer explicit totalAmount field, fallback to amount
    const TCV = toNum(chit.totalAmount ?? chit.amount ?? 0);
    const RCA = Math.max(0, toNum(bidAmount));
    // Gross Wallet Balance
    const GWB = Math.max(0, TCV - RCA);
    // Commission = 5% of GWB
    const commission = Number((GWB * 0.05).toFixed(2));
    // Final Wallet Amount after commission
    const FWA = Number(Math.max(0, GWB - commission).toFixed(2));
    // walletAmount may be provided explicitly; default walletAmount = RCA
    const walletAmt = walletAmount === undefined ? RCA : toNum(walletAmount);

    // Build release payload
    const released = {
      rca: RCA,
      gwb: GWB,
      commission,
      fwa: FWA,
      walletAmount: walletAmt,
      releasedAt: new Date(),
      releasedBy: req.user ? req.user._id : undefined,
      note: req.body.note || ''
    };

    // Save onto chit doc
    chit.released = released;
    // Optionally also update chit.walletAmount/top-level convenience fields
    chit.walletAmount = walletAmt;
    // If you prefer a "distributedAmount" field:
    chit.distributedAmount = GWB; // amount to be distributed among members before commission

    await chit.save();

    return res.json({ success: true, chit });
  } catch (err) {
    console.error('releaseChit error', err);
    next(err);
  }
};
