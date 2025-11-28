const mongoose = require('mongoose');
const ChitScheme = require('../models/ChitScheme');
const ChitMember = require('../models/chitMemberModel');
const Contribution = require('../models/contributionModel'); // payments
const User = require('../models/User');


exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user); 
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.address = req.body.address || user.address;
      user.location = req.body.location || user.location;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        location: updatedUser.location,
        role: updatedUser.role,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      name: user.name,
      email: user.email,
      role: user.role,
      message: `Welcome to your dashboard, ${user.name}`,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin-only: get chit schemes a user belongs to
// Admin-only: get chit schemes a user belongs to
exports.adminGetUserChits = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    // IMPORTANT: use `new` when creating ObjectId in some mongoose/node versions
    const uid = new mongoose.Types.ObjectId(userId);

    const query = {
      $or: [
        { 'joinedUsers.user': uid },
        { 'joinedUsers': { $elemMatch: { $eq: uid } } },
        { 'currentMembers': { $elemMatch: { $eq: uid } } }
      ]
    };

    const chits = await ChitScheme.find(query)
      .select('name amount durationInMonths totalMembers createdBy createdAt joinedUsers currentMembers')
      .lean();

    // Fetch ChitMember records to get joinedAt if present
    const chitMemberRecords = await ChitMember.find({ userId: uid }).select('chitId createdAt').lean();
    const joinedAtMap = {};
    chitMemberRecords.forEach((cm) => {
      if (cm.chitId) joinedAtMap[String(cm.chitId)] = cm.createdAt || (cm._id && cm._id.getTimestamp && cm._id.getTimestamp()) || null;
    });

    const normalized = chits.map((c) => ({
      _id: c._id,
      name: c.name,
      amount: c.amount,
      durationInMonths: c.durationInMonths,
      totalMembers: c.totalMembers,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
      joinedAt: joinedAtMap[String(c._id)] || null,
      joinedCount: Array.isArray(c.joinedUsers) ? c.joinedUsers.length : (Array.isArray(c.currentMembers) ? c.currentMembers.length : 0)
    }));

    return res.json({ success: true, chits: normalized });
  } catch (err) {
    console.error('adminGetUserChits error', err);
    return next(err);
  }
};


// Admin-only: get payments/contributions for a user
exports.adminGetUserPayments = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    // Find contributions/payments by user. Adjust query fields if your model differs.
    const payments = await Contribution.find({ userId })
      .populate('chitId', 'name') // populate chit name if reference exists
      .sort({ createdAt: -1 })
      .lean();

    // Normalize fields to a safe shape for frontend
    const normalized = payments.map((p) => ({
      _id: p._id,
      amount: p.amount || p.paymentAmount || 0,
      status: p.status || p.paymentStatus || 'pending',
      createdAt: p.createdAt,
      chitId: p.chitId ? (p.chitId._id || p.chitId) : null,
      chitName: p.chitId ? (p.chitId.name || null) : (p.chitName || null),
      // include raw object if frontend needs other fields
      raw: p
    }));

    return res.json({ success: true, payments: normalized });
  } catch (err) {
    console.error('adminGetUserPayments error', err);
    return next(err);
  }
};
