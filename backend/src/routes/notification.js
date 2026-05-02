const express = require('express');
const requireAuth = require('../middlewares/requireAuth');
const {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllReadNotifications,
} = require('../controllers/notificationController');

const router = express.Router();

// All notification routes require authentication
router.use(requireAuth);

// Get all notifications for current user
router.get('/', getNotifications);

// Get unread notification count
router.get('/unread-count', getUnreadNotificationCount);

// Mark notification as read
router.put('/:id/read', markNotificationAsRead);

// Mark all notifications as read
router.put('/mark-all-read', markAllNotificationsAsRead);

// Delete a notification
router.delete('/:id', deleteNotification);

// Delete all read notifications
router.delete('/read/all', deleteAllReadNotifications);

module.exports = router;
