const ChitMember = require('../models/chitMemberModel');

// @desc    Register user to chit
// @route   POST /api/chit-member/join
exports.joinChit = async (req, res) => {
  const { userId, chitId } = req.body;

  try {
    const alreadyJoined = await ChitMember.findOne({ userId, chitId });

    if (alreadyJoined) {
      return res.status(400).json({ success: false, message: 'Already joined this chit' });
    }

    const member = await ChitMember.create({ userId, chitId });
    res.status(201).json({ success: true, member });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error joining chit' });
  }
};
