const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  chitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChitScheme', // Updated to your actual model name
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Directly linking to User
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paidDate: {
    type: Date,
    default: Date.now
  },
  month: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Contribution', contributionSchema);
