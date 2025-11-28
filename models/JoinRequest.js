// backend/models/JoinRequest.js
const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chitId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChitScheme', required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
