const express = require('express');
const router = express.Router();
const { registerUser, getCurrentUser,loginUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', upload.single('profileImage'), registerUser);

router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser); // ✅ this is the missing route

module.exports = router;
