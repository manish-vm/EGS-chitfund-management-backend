// backend/controllers/documentController.js
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const UserDocument = require('../models/UserDocument');

// helper to build file path stored in DB (relative path)
const toDbPath = (filename) => `/uploads/documents/${filename}`;

// Helper: produce response-friendly "documents" object that frontend expects
const buildResponseDocs = (docModel) => {
  if (!docModel) return {};
  return {
    aadharNumber: docModel.aadharNumber || '',
    panNumber: docModel.panNumber || '',
    additionalProofText: docModel.additionalProofText || '',
    verificationStatus: docModel.verificationStatus || 'pending',
    uploadedByUser: !!docModel.uploadedByUser,
    aadharDoc: docModel.aadharFile && docModel.aadharFile.path ? docModel.aadharFile.path : '',
    aadharFile: docModel.aadharFile && docModel.aadharFile.filename ? {
      path: docModel.aadharFile.path,
      filename: docModel.aadharFile.filename,
      mimetype: docModel.aadharFile.mimetype,
      size: docModel.aadharFile.size
    } : null,
    panDoc: docModel.panFile && docModel.panFile.path ? docModel.panFile.path : '',
    panFile: docModel.panFile && docModel.panFile.filename ? {
      path: docModel.panFile.path,
      filename: docModel.panFile.filename,
      mimetype: docModel.panFile.mimetype,
      size: docModel.panFile.size
    } : null,
    additionalProofFile: docModel.additionalProofFile && docModel.additionalProofFile.path ? docModel.additionalProofFile.path : '',
    additionalProofFileObj: docModel.additionalProofFile && docModel.additionalProofFile.filename ? {
      path: docModel.additionalProofFile.path,
      filename: docModel.additionalProofFile.filename,
      mimetype: docModel.additionalProofFile.mimetype,
      size: docModel.additionalProofFile.size
    } : null,
    updatedAt: docModel.updatedAt,
    history: docModel.history || []
  };
};

// GET /documents/me
const getMyDocuments = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate('documents');
    const docs = user?.documents ? buildResponseDocs(user.documents) : {};
    return res.json({ success: true, documents: docs });
  } catch (err) {
    console.error('getMyDocuments error', err);
    return res.status(500).json({ success: false, message: 'Failed to get documents' });
  }
};

// POST /documents/me (user upload)
const submitMyDocuments = async (req, res) => {
  try {
    const userId = req.user._id;

    // find existing doc record or create
    let doc = await UserDocument.findOne({ user: userId });
    if (!doc) {
      doc = new UserDocument({ user: userId });
    }

    // textual fields
    if (req.body.aadharNumber !== undefined) doc.aadharNumber = String(req.body.aadharNumber || '');
    if (req.body.panNumber !== undefined) doc.panNumber = String(req.body.panNumber || '');
    if (req.body.additionalProofText !== undefined) doc.additionalProofText = String(req.body.additionalProofText || '');

    // files from multer.fields
    const files = req.files || {};

    if (files['aadharDoc'] && files['aadharDoc'][0]) {
      const f = files['aadharDoc'][0];
      doc.aadharFile = {
        path: toDbPath(f.filename),
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size
      };
      doc.history.push({ action: 'uploaded', actor: userId, actorRole: 'user', note: 'aadhar uploaded' });
    }

    if (files['panDoc'] && files['panDoc'][0]) {
      const f = files['panDoc'][0];
      doc.panFile = {
        path: toDbPath(f.filename),
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size
      };
      doc.history.push({ action: 'uploaded', actor: userId, actorRole: 'user', note: 'pan uploaded' });
    }

    if (files['additionalProofFile'] && files['additionalProofFile'][0]) {
      const f = files['additionalProofFile'][0];
      doc.additionalProofFile = {
        path: toDbPath(f.filename),
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size
      };
      doc.history.push({ action: 'uploaded', actor: userId, actorRole: 'user', note: 'additional proof uploaded' });
    }

    doc.uploadedByUser = true;
    doc.updatedAt = new Date();
    await doc.save();

    // ensure user.documents references this doc
    const user = await User.findById(userId);
    if (!user.documents) {
      user.documents = doc._id;
      await user.save();
    }

    return res.json({ success: true, documents: buildResponseDocs(doc) });
  } catch (err) {
    console.error('submitMyDocuments error', err);
    return res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
};

// GET /documents/user/:id  (admin)
const adminGetUserDocuments = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).populate('documents');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const docs = user.documents ? buildResponseDocs(user.documents) : {};
    return res.json({ success: true, user: { _id: user._id, name: user.name, email: user.email }, documents: docs });
  } catch (err) {
    console.error('adminGetUserDocuments error', err);
    return res.status(500).json({ success: false, message: 'Failed to get documents' });
  }
};

// PUT /documents/user/:id (admin update/upload)
const adminUpdateUserDocuments = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const adminUser = req.user; // actor
    const files = req.files || {};

    // ensure target user exists
    let targetUser = await User.findById(targetUserId).populate('documents');
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    // find or create doc record
    let doc = targetUser.documents ? await UserDocument.findById(targetUser.documents._id || targetUser.documents) : null;
    if (!doc) {
      doc = new UserDocument({ user: targetUserId });
    }

    // textual updates
    if (req.body.aadharNumber !== undefined) doc.aadharNumber = String(req.body.aadharNumber || '');
    if (req.body.panNumber !== undefined) doc.panNumber = String(req.body.panNumber || '');
    if (req.body.additionalProofText !== undefined) doc.additionalProofText = String(req.body.additionalProofText || '');

    // files
    if (files['aadharDoc'] && files['aadharDoc'][0]) {
      const f = files['aadharDoc'][0];
      doc.aadharFile = {
        path: toDbPath(f.filename),
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size
      };
      doc.history.push({ action: 'admin_uploaded', actor: adminUser._id, actorRole: 'admin', note: 'admin uploaded aadhar' });
    }

    if (files['panDoc'] && files['panDoc'][0]) {
      const f = files['panDoc'][0];
      doc.panFile = {
        path: toDbPath(f.filename),
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size
      };
      doc.history.push({ action: 'admin_uploaded', actor: adminUser._id, actorRole: 'admin', note: 'admin uploaded pan' });
    }

    if (files['additionalProofFile'] && files['additionalProofFile'][0]) {
      const f = files['additionalProofFile'][0];
      doc.additionalProofFile = {
        path: toDbPath(f.filename),
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size
      };
      doc.history.push({ action: 'admin_uploaded', actor: adminUser._id, actorRole: 'admin', note: 'admin uploaded additional proof' });
    }

    doc.uploadedByUser = doc.uploadedByUser || false;
    doc.updatedAt = new Date();
    await doc.save();

    // ensure user.documents points to the doc
    if (!targetUser.documents) {
      targetUser.documents = doc._id;
      await targetUser.save();
    }

    return res.json({ success: true, documents: buildResponseDocs(doc) });
  } catch (err) {
    console.error('adminUpdateUserDocuments error', err);
    return res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
};

// PATCH /documents/user/:id/status
const adminUpdateVerificationStatus = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { verificationStatus, note } = req.body;
    const adminUser = req.user;

    const user = await User.findById(targetUserId).populate('documents');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let doc = user.documents ? await UserDocument.findById(user.documents._id || user.documents) : null;
    if (!doc) {
      // nothing to change
      return res.status(404).json({ success: false, message: 'No documents available for this user' });
    }

    if (!['pending', 'verified', 'rejected'].includes(String(verificationStatus))) {
      return res.status(400).json({ success: false, message: 'Invalid verificationStatus' });
    }

    doc.verificationStatus = verificationStatus;
    doc.history.push({
      action: 'status_changed',
      actor: adminUser._id,
      actorRole: 'admin',
      note: note || `status set to ${verificationStatus}`
    });
    doc.updatedAt = new Date();
    await doc.save();

    return res.json({ success: true, verificationStatus: doc.verificationStatus, documents: buildResponseDocs(doc) });
  } catch (err) {
    console.error('adminUpdateVerificationStatus error', err);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// GET /documents/user/:id/download?key=aadharDoc (admin)
const adminDownloadUserDocument = async (req, res) => {
  try {
    const userId = req.params.id;
    const fieldKey = req.query.key || 'aadharDoc'; // expected keys: aadharDoc|panDoc|additionalProofFile
    const user = await User.findById(userId).populate('documents');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const doc = user.documents ? await UserDocument.findById(user.documents._id || user.documents) : null;
    if (!doc) return res.status(404).json({ success: false, message: 'No documents found' });

    let fileObj = null;
    if (fieldKey === 'aadharDoc') fileObj = doc.aadharFile;
    else if (fieldKey === 'panDoc') fileObj = doc.panFile;
    else if (fieldKey === 'additionalProofFile') fileObj = doc.additionalProofFile;
    else {
      // also accept legacy keys
      fileObj = doc.aadharFile || doc.panFile || doc.additionalProofFile;
    }

    if (!fileObj || !fileObj.path) return res.status(404).json({ success: false, message: 'Requested file not found' });

    const absolutePath = path.join(__dirname, '..', fileObj.path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'File missing on server' });
    }

    return res.download(absolutePath, fileObj.filename);
  } catch (err) {
    console.error('adminDownloadUserDocument error', err);
    return res.status(500).json({ success: false, message: 'Failed to download file' });
  }
};

module.exports = {
  getMyDocuments,
  submitMyDocuments,
  adminGetUserDocuments,
  adminUpdateUserDocuments,
  adminUpdateVerificationStatus,
  adminDownloadUserDocument
};
