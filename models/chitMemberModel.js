const mongoose = require('mongoose');

const chitMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chit',
    required: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  contributionPaid: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('ChitMember', chitMemberSchema);
