const Contribution = require('../models/contributionModel');
const ChitScheme = require('../models/ChitScheme');
const User = require('../models/User');
const mongoose = require('mongoose');

exports.addContribution = async (req, res) => {
  const { chitId, userId, amount, month, year } = req.body;

  console.log('💡 Received Contribution Request');
  console.log('chitId:', chitId);
  console.log('userId:', userId);
  console.log('month/year:', month, year);

  try {
    const chit = await ChitScheme.findById(chitId);
    if (!chit) {
      console.log('❌ Chit not found');
      return res.status(404).json({ success: false, message: 'Chit scheme not found' });
    }

    console.log('✅ Chit found:', chit.name);
    console.log('Joined Users:', chit.joinedUsers.map(u => u.toString()));
    console.log('Incoming userId:', userId.toString());

    if (!chit.joinedUsers.map(id => id.toString()).includes(userId.toString())) {
      console.log('❌ User not in joinedUsers');
      return res.status(403).json({ success: false, message: 'User has not joined this chit' });
    }

    const existing = await Contribution.findOne({ chitId, userId, month, year });
    if (existing) {
      console.log('❌ Duplicate contribution detected');
      return res.status(400).json({ success: false, message: 'Contribution already recorded for this period' });
    }

    const contribution = await Contribution.create({ chitId, userId, amount, month, year });
    console.log('✅ Contribution recorded:', contribution);

    res.status(201).json({ success: true, contribution });
  } catch (error) {
    console.error('❌ Contribution error:', error);
    res.status(500).json({ success: false, message: 'Error recording contribution' });
  }
};

exports.getContributionsByUser = async (req, res, next) => {
  try {
    // accept query.userId for admin or frontend; fallback to authenticated user
    const userId = req.query.userId || (req.user && req.user._id);
    if (!userId) {
      return res.status(400).json({ message: 'userId required' });
    }

    const contributions = await Contribution.find({ userId })
      .populate('chitId', 'name')
      .sort({ paidDate: -1 });

    res.json({ contributions });
  } catch (err) {
    next(err);
  }
};


// Get all contributions for a chit
exports.getContributionsByChit = async (req, res) => {
  try {
    const { chitId } = req.params;

    const contributions = await Contribution.find({ chitId })
      .populate('userId', 'name email') // optional
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, contributions });
  } catch (error) {
    console.error('Error fetching contributions by chit:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get unpaid months for a user in a chit
exports.getContributionStatus = async (req, res) => {
  try {
    const { chitId, userId } = req.params;

    const chit = await ChitScheme.findById(chitId);
    if (!chit) {
      return res.status(404).json({ success: false, message: 'Chit not found' });
    }

    if (!chit.joinedUsers.map(id => id.toString()).includes(userId.toString())) {
      return res.status(403).json({ success: false, message: 'User has not joined this chit' });
    }

    // Get all months and years for this chit
    const startDate = new Date(chit.startDate);
    const duration = chit.durationInMonths;

    const months = [];
    for (let i = 0; i < duration; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      months.push({ month: date.toLocaleString('default', { month: 'long' }), year: date.getFullYear() });
    }

    // Fetch paid contributions
    const paid = await Contribution.find({ chitId, userId });

    // Build list of unpaid months
    const unpaid = months.filter(({ month, year }) => {
      return !paid.some(p => p.month === month && p.year === year);
    });

    res.status(200).json({ success: true, unpaid });
  } catch (error) {
    console.error('Error getting contribution status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
