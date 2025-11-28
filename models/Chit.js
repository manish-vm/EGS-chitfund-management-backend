const mongoose = require('mongoose');

const chitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  members: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Chit', chitSchema);
