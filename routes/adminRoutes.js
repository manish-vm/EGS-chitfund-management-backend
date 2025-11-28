// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const {
  getAdminDashboardStats,
  getAdminDashboard,
  getRecentUsers,approveChitForUser,
  getAllUsers,
  deleteUserById,
  makeAdmin,
  getReports,
  getUserById
} = require('../controllers/adminController');
const { getAdminReports } = require('../controllers/adminReportController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

const { adminGetUserChits, adminGetUserPayments } = require('../controllers/userController');

// If your auth middleware exposes role on req.user, we enforce admin here:
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Route to get chits for a user
router.get('/users/:id/chits', protect, requireAdmin, adminGetUserChits);

// Route to get payments for a user
router.get('/users/:id/payments', protect, requireAdmin, adminGetUserPayments);

router.get('/stats',  getAdminDashboardStats); 
router.get('/dashboard', protect, adminOnly, getAdminDashboard);   
router.get('/recent-users', getRecentUsers);
router.get('/users', getAllUsers);
router.delete('/user/:id',deleteUserById);
router.put('/approve-chit/:userId', approveChitForUser);

router.put('/make-admin/:userId', makeAdmin);

router.get('/users/:id', protect, adminOnly, getUserById);
// GET admin reports (protected)
router.get('/reports', protect, requireAdmin, getAdminReports);

module.exports = router;
