const prisma = require('../lib/prisma');
const { markAsRead, markAllAsRead, getUnreadCount } = require('../lib/notificationHelper');

/**
 * Get all notifications for current user
 */
async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, read, type } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      userId,
      ...(read !== undefined && { read: read === 'true' }),
      ...(type && { type }),
    };

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
    ]);

    // Get unread count
    const unreadCount = await getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching notifications.',
    });
  }
}

/**
 * Get unread notification count
 */
async function getUnreadNotificationCount(req, res) {
  try {
    const userId = req.user.id;
    const count = await getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching unread count.',
    });
  }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const success = await markAsRead(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while marking notification as read.',
    });
  }
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsAsRead(req, res) {
  try {
    const userId = req.user.id;
    const count = await markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: `${count} notification(s) marked as read.`,
      data: { count },
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while marking notifications as read.',
    });
  }
}

/**
 * Delete a notification
 */
async function deleteNotification(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await prisma.notification.deleteMany({
      where: {
        id,
        userId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting notification.',
    });
  }
}

/**
 * Delete all read notifications
 */
async function deleteAllReadNotifications(req, res) {
  try {
    const userId = req.user.id;

    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        read: true,
      },
    });

    res.status(200).json({
      success: true,
      message: `${result.count} notification(s) deleted.`,
      data: { count: result.count },
    });
  } catch (error) {
    console.error('Delete all read notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting notifications.',
    });
  }
}

module.exports = {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllReadNotifications,
};
