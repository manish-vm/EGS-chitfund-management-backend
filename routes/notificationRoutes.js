// backend/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notificationController');

router.use(protect);

router.get('/', getUserNotifications);
router.patch('/:id/read', markNotificationRead);
router.patch('/read-all', markAllRead);
router.delete('/:id', deleteNotification); // delete single
router.delete('/', deleteAllNotifications); // delete all for current user

module.exports = router;
