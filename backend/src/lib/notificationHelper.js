const prisma = require('./prisma');
const { sendNotificationEmail } = require('./mailer');

/**
 * Create a notification for a user (in-app + email)
 */
async function createNotification({
  userId,
  type,
  title,
  message,
  relatedId = null,
  relatedType = null,
  actionUrl = null,
  metadata = null,
  sendEmail = true, // Option to disable email
}) {
  try {
    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedId,
        relatedType,
        actionUrl,
        metadata,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    // Send email notification (async, don't wait)
    if (sendEmail && notification.user.email) {
      sendNotificationEmail(
        notification.user.email,
        type,
        title,
        message,
        actionUrl
      ).catch(error => {
        console.error('Error sending notification email:', error);
        // Don't fail the notification creation if email fails
      });
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Create notifications for multiple users (in-app + email)
 */
async function createBulkNotifications(notifications, sendEmail = true) {
  try {
    // Create in-app notifications
    const result = await prisma.notification.createMany({
      data: notifications,
    });

    // Send email notifications (async, don't wait)
    if (sendEmail && notifications.length > 0) {
      // Get user emails for all notifications
      const userIds = [...new Set(notifications.map(n => n.userId))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      });

      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });

      // Send emails in parallel (but don't wait for them)
      notifications.forEach(notification => {
        const user = userMap[notification.userId];
        if (user && user.email) {
          sendNotificationEmail(
            user.email,
            notification.type,
            notification.title,
            notification.message,
            notification.actionUrl
          ).catch(error => {
            console.error(`Error sending email to ${user.email}:`, error.message);
            // Don't fail the notification creation if email fails
          });
        }
      });
    }

    return result;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    return null;
  }
}

/**
 * Notify all organization members (in-app + email)
 */
async function notifyOrganizationMembers({
  organizationId,
  type,
  title,
  message,
  relatedId = null,
  relatedType = null,
  actionUrl = null,
  metadata = null,
  excludeUserId = null,
  sendEmail = true, // Option to disable email
}) {
  try {
    // Get all organization members
    const members = await prisma.user.findMany({
      where: {
        OR: [
          { organizationId, isMember: true },
          {
            adminOrganization: {
              id: organizationId,
            },
          },
        ],
        ...(excludeUserId && { id: { not: excludeUserId } }),
      },
      select: { id: true },
    });

    if (members.length === 0) return null;

    // Create notifications for all members
    const notifications = members.map((member) => ({
      userId: member.id,
      type,
      title,
      message,
      relatedId,
      relatedType,
      actionUrl,
      metadata,
    }));

    return await createBulkNotifications(notifications, sendEmail);
  } catch (error) {
    console.error('Error notifying organization members:', error);
    return null;
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
    return notification.count > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
async function markAllAsRead(userId) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
    return result.count;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return 0;
  }
}

/**
 * Delete old notifications (older than 30 days)
 */
async function deleteOldNotifications() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
    return result.count;
  } catch (error) {
    console.error('Error deleting old notifications:', error);
    return 0;
  }
}

/**
 * Get unread count for a user
 */
async function getUnreadCount(userId) {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

module.exports = {
  createNotification,
  createBulkNotifications,
  notifyOrganizationMembers,
  markAsRead,
  markAllAsRead,
  deleteOldNotifications,
  getUnreadCount,
};
