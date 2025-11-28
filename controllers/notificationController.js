// backend/controllers/notificationController.js
const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * Returns notifications for the current user, newest first
 * Query params: limit (optional), unreadOnly (optional boolean)
 */
exports.getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 50, unreadOnly } = req.query;
    const filter = { userId };
    if (unreadOnly === 'true' || unreadOnly === true) {
      filter.read = false;
    }
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read (only if it belongs to current user)
 */
exports.markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const id = req.params.id;
    const notif = await Notification.findOne({ _id: id, userId });
    if (!notif) {
      res.status(404);
      return next(new Error('Notification not found'));
    }
    if (!notif.read) {
      notif.read = true;
      await notif.save();
    }
    res.json({ success: true, notification: notif });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Optional: mark all notifications for current user as read
 */
exports.markAllRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a single notification (owned by current user)
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const id = req.params.id;
    const result = await Notification.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      res.status(404);
      return next(new Error('Notification not found or not owned by user'));
    }
    res.json({ success: true, deletedId: id });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/notifications
 * Delete all notifications for current user
 */
exports.deleteAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Notification.deleteMany({ userId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
