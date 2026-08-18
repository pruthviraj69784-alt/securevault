const prisma = require("../config/prisma");

class NotificationRepository {
  mapNotification(item) {
    if (!item) return null;
    return {
      ...item,
      _id: item.id,
      user: item.userId
    };
  }

  async createNotification(data) {
    const created = await prisma.notification.create({
      data: {
        userId: String(data.user || data.userId),
        title: data.title,
        message: data.message,
        type: data.type || "FILE_SHARED",
        priority: data.priority || "NORMAL",
        isRead: data.isRead || false,
        actionUrl: data.actionUrl || "",
        metadata: data.metadata || {}
      }
    });
    return this.mapNotification(created);
  }

  async getUserNotifications(userId, page = 1, limit = 20) {
    const items = await prisma.notification.findMany({
      where: { userId: String(userId) },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    });
    return items.map(i => this.mapNotification(i));
  }

  async getUnreadCount(userId) {
    return await prisma.notification.count({
      where: { userId: String(userId), isRead: false }
    });
  }

  async markRead(id, userId) {
    const updated = await prisma.notification.updateMany({
      where: { id: String(id), userId: String(userId) },
      data: { isRead: true }
    });
    if (updated.count === 0) return null;
    const item = await prisma.notification.findUnique({ where: { id: String(id) } });
    return this.mapNotification(item);
  }

  async markAllRead(userId) {
    await prisma.notification.updateMany({
      where: { userId: String(userId), isRead: false },
      data: { isRead: true }
    });
    return true;
  }

  async deleteNotification(id, userId) {
    await prisma.notification.deleteMany({
      where: { id: String(id), userId: String(userId) }
    });
    return true;
  }
}

module.exports = new NotificationRepository();
