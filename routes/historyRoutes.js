const express = require('express');
const router = express.Router();
const {
  addPayment,
  getUserHistory,
  getSchemeHistory,
} = require('../controllers/historyController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

// POST /api/history/pay - Add payment (user)
router.post('/pay', protect, addPayment);

// GET /api/history/user - Get logged-in user's history
router.get('/user', protect, getUserHistory);

// GET /api/history/scheme/:id - Admin: full scheme history
router.get('/scheme/:id', protect, adminOnly, getSchemeHistory);

module.exports = router;
