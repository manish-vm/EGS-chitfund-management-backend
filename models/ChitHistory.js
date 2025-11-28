const mongoose = require('mongoose');

const chitHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  schemeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChitScheme',
    required: true,
  },

  month: {
    type: Number,
    required: true,
  },

  year: {
    type: Number,
    required: true,
  },

  paymentDate: {
    type: Date,
    default: Date.now,
  },

  amountPaid: {
    type: Number,
    required: true,
  },

  isAuctionWinner: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

module.exports = mongoose.model('ChitHistory', chitHistorySchema);
