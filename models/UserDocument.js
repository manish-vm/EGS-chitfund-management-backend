// backend/models/UserDocument.js
const mongoose = require('mongoose');

const DocumentHistorySchema = new mongoose.Schema({
  action: { type: String }, // 'uploaded','updated','status_changed','admin_uploaded', ...
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: { type: String, default: 'user' },
  note: { type: String },
  timestamp: { type: Date, default: Date.now },
  meta: { type: mongoose.Schema.Types.Mixed }
});

const FileSubSchema = new mongoose.Schema({
  path: { type: String, default: '' },    // e.g. /uploads/documents/123-name.pdf
  filename: { type: String, default: '' },
  mimetype: { type: String, default: '' },
  size: { type: Number, default: 0 }
}, { _id: false });

const UserDocumentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  aadharNumber: { type: String, default: '' },
  panNumber: { type: String, default: '' },

  aadharFile: { type: FileSubSchema, default: () => ({}) },
  panFile: { type: FileSubSchema, default: () => ({}) },

  additionalProofText: { type: String, default: '' },
  additionalProofFile: { type: FileSubSchema, default: () => ({}) },

  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
    index: true
  },

  uploadedByUser: { type: Boolean, default: false },

  updatedAt: { type: Date, default: Date.now },

  history: { type: [DocumentHistorySchema], default: [] }
});

module.exports = mongoose.model('UserDocument', UserDocumentSchema);
