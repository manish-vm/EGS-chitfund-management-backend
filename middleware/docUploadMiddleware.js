// backend/middleware/docUploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads', 'documents');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_ROOT);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
    cb(null, filename);
  }
});

const allowedMime = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
const fileFilter = (req, file, cb) => {
  if (allowedMime.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type. Only PNG/JPG/PDF allowed.'));
};

const limits = { fileSize: 6 * 1024 * 1024 };

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
