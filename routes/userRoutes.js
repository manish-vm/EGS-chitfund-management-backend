const express = require('express');
const router = express.Router();
const {
 getUserById,
  updateUserProfile,
  getUserDashboard,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/user/profile
// GET /api/user/profile?id=USER_ID
router.get('/profile/:id', getUserById);
// PUT /api/user/profile
router.put('/profile', protect, updateUserProfile);

// GET /api/user/dashboard
router.get('/dashboard', protect, getUserDashboard);

module.exports = router;
