const ChitHistory = require('../models/ChitHistory');


exports.addPayment = async (req, res) => {
  const { schemeId, amountPaid, isAuctionWinner } = req.body;
  const date = new Date();

  try {
    const history = new ChitHistory({
      userId: req.user._id,
      schemeId,
      amountPaid,
      isAuctionWinner: isAuctionWinner || false,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });

    const saved = await history.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Error saving payment history', err });
  }
};

// @desc Get user chit history
// @route GET /api/history/user
// @access Private
exports.getUserHistory = async (req, res) => {
  try {
    const history = await ChitHistory.find({ userId: req.user._id })
      .populate('schemeId', 'name amount')
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user history', err });
  }
};

// @desc Get full scheme history (admin view)
// @route GET /api/history/scheme/:id
// @access Admin
exports.getSchemeHistory = async (req, res) => {
  try {
    const records = await ChitHistory.find({ schemeId: req.params.id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching scheme history', err });
  }
};
