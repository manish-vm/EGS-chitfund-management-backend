// backend/routes/documentRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/docUploadMiddleware'); // <--- match filename
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getMyDocuments,
  submitMyDocuments,
  adminGetUserDocuments,
  adminUpdateUserDocuments,
  adminUpdateVerificationStatus,
  adminDownloadUserDocument
} = require('../controllers/documentController');

// User endpoints
router.get('/me', protect, getMyDocuments);

// Accept multipart: fields aadharDoc, panDoc, additionalProofFile
router.post('/me', protect, upload.fields([
  { name: 'aadharDoc', maxCount: 1 },
  { name: 'panDoc', maxCount: 1 },
  { name: 'additionalProofFile', maxCount: 1 }
]), submitMyDocuments);

// Admin endpoints
router.get('/user/:id', protect, adminOnly, adminGetUserDocuments);

router.put('/user/:id', protect, adminOnly, upload.fields([
  { name: 'aadharDoc', maxCount: 1 },
  { name: 'panDoc', maxCount: 1 },
  { name: 'additionalProofFile', maxCount: 1 }
]), adminUpdateUserDocuments);

router.patch('/user/:id/status', protect, adminOnly, adminUpdateVerificationStatus);

router.get('/user/:id/download', protect, adminOnly, adminDownloadUserDocument);

module.exports = router;
