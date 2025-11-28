// backend/models/Payment.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chitId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChitScheme', required: true },
  amount: { type: Number, required: true },
  month: { type: String }, // e.g., "June"
  year: { type: Number },  // e.g., 2025
  note: { type: String },

  // status: pending -> verification_requested -> paid/completed OR rejected
  status: { type: String, enum: ['pending','verification_requested','paid','rejected','failed'], default: 'pending' },

  // optional fields used when admin approves
  paidAt: { type: Date },
  rejectionReason: { type: String },

  // optional UPI metadata from backend (upiId etc.)
  upi: {
    upiId: String,
    payeeName: String
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PaymentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);
