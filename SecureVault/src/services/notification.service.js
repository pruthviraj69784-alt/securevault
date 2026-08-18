const notificationRepository = require("../repositories/notification.repository");
const AppError = require("../Error/AppError");

class NotificationService {
  async notify({ userId, title, message, type, priority, actionUrl, metadata }) {
    if (!userId) return null;
    return await notificationRepository.createNotification({
      user: userId,
      title: title || "Notification",
      message: message || "",
      type: type || "FILE_SHARED",
      priority: priority || "NORMAL",
      actionUrl: actionUrl || "",
      metadata: metadata || {}
    });
  }

  async getNotifications(userId, page, limit) {
    const notifications = await notificationRepository.getUserNotifications(userId, page, limit);
    const unreadCount = await notificationRepository.getUnreadCount(userId);
    return { notifications, unreadCount };
  }

  async getUnreadCount(userId) {
    const count = await notificationRepository.getUnreadCount(userId);
    return { count };
  }

  async markAsRead(id, userId) {
    const updated = await notificationRepository.markRead(id, userId);
    if (!updated) throw new AppError("Notification not found", 440, 404);
    return updated;
  }

  async markAllAsRead(userId) {
    await notificationRepository.markAllRead(userId);
    return { success: true };
  }

  async deleteNotification(id, userId) {
    const deleted = await notificationRepository.deleteNotification(id, userId);
    if (!deleted) throw new AppError("Notification not found", 440, 404);
    return deleted;
  }
}

module.exports = new NotificationService();
