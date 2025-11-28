// backend/routes/joinRequestRoutes.js
const express = require('express');
const router = express.Router();
const {
  createJoinRequest,
  getUserJoinRequests,
  getPendingJoinRequests,
  approveJoinRequest,
  rejectJoinRequest
} = require('../controllers/joinRequestController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

// Create a join request for a chit (user)
router.post('/:chitId', protect, createJoinRequest);

// Get current user's join requests
router.get('/user/requests', protect, getUserJoinRequests); // path: /api/join-requests/user/requests

// Admin: get all pending requests
router.get('/pending', protect, adminOnly, getPendingJoinRequests);

// Admin: approve a request
router.put('/:id/approve', protect, adminOnly, approveJoinRequest);

// Admin: reject a request
router.put('/:id/reject', protect, adminOnly, rejectJoinRequest);

module.exports = router;
