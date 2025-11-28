// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true },
  image: { type: String, required: false },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  isApproved: { type: Boolean, default: false },
  location: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },

  // Reference to separate document record
  documents: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserDocument',
    default: null
  }
});

// password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
