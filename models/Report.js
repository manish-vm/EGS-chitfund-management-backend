// backend/models/Report.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  generatedAt: { type: Date, default: Date.now, required: true,},
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, },
  rows: [
    {
      chitId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChitScheme' },
      name: String,
      totalMembers: Number,
      amount: Number,
      collectedAmount: Number,
      pendingAmount: Number,
      createdAt: Date,
      startDate: Date,
      required: true,
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
