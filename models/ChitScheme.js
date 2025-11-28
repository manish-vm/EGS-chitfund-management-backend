const mongoose = require('mongoose');

const chitSchemeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  durationInMonths: { type: Number, required: true },
  totalMembers: { type: Number, required: true },
  currentMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startDate: { type: Date, required: true },
  status: {
    type: String,
    enum: [
      'new',
      'open',       // <--- include lowercase "open"
      'running',
      'released',
      'active',
      'closed',
      'completed',
      'draft',
      'cancelled',
      // add any other allowed values your app uses
    ],
    default: 'draft'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  joinedUsers: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      isApproved: { type: Boolean, default: false }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('ChitScheme', chitSchemeSchema);
