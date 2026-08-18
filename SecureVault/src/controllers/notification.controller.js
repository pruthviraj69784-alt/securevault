const notificationService = require("../services/notification.service");
const asyncHandler = require("../utils/asyncHandler");

class NotificationController {
  getNotifications = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await notificationService.getNotifications(req.user.id, page, limit);
    res.json({ success: true, data });
  });

  getUnreadCount = asyncHandler(async (req, res) => {
    const data = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, data });
  });

  markRead = asyncHandler(async (req, res) => {
    const data = await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, message: "Marked as read", data });
  });

  markAllRead = asyncHandler(async (req, res) => {
    const data = await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, message: "All notifications marked as read", data });
  });

  deleteNotification = asyncHandler(async (req, res) => {
    const data = await notificationService.deleteNotification(req.params.id, req.user.id);
    res.json({ success: true, message: "Notification deleted", data });
  });
}

module.exports = new NotificationController();
