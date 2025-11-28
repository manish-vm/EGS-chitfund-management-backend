const mongoose = require('mongoose');
const { Schema } = mongoose;

const GeneratedChitSchema = new Schema({
  chitId: { type: Schema.Types.ObjectId, ref: 'Chit', required: true, index: true },
  chitName: { type: String, required: true },
  monthKey: { type: String, required: true, index: true }, // "YYYY-MM"
  chitNo: { type: Number, required: true }, // 1,2,3... per chitId+monthKey
  date: { type: Date, default: Date.now },
  walletAmount: { type: Number, required: true },
  bidAmount: { type: Number, required: true },
  distributed: { type: Number, required: true },
  // NEW: mark if this generated row represents a release (payout)
  isRelease: { type: Boolean, default: false },
  // NEW: store the actual released amount (if any)
  releasedAmount: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, // optional: who generated it
}, {
  timestamps: true,
});

// optional unique-ish constraint: ensure chitNo uniqueness per chitId+monthKey
GeneratedChitSchema.index({ chitId: 1, monthKey: 1, chitNo: 1 }, { unique: true });

module.exports = mongoose.model('GeneratedChit', GeneratedChitSchema);
