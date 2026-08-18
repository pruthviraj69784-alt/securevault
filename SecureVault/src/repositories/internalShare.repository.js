const prisma = require("../config/prisma");

class InternalShareRepository {
  mapShare(share) {
    if (!share) return null;
    return {
      ...share,
      _id: share.id,
      owner: share.owner ? { ...share.owner, _id: share.owner.id } : share.ownerId,
      recipient: share.recipient ? { ...share.recipient, _id: share.recipient.id } : share.recipientId,
      file: share.file ? {
        ...share.file,
        _id: share.file.id,
        versions: (share.file.versions || []).map(v => ({ ...v, _id: v.id }))
      } : share.fileId
    };
  }

  async createShare(shareData) {
    const ownerId = typeof shareData.owner === "object" ? (shareData.owner.id || shareData.owner._id) : (shareData.ownerId || shareData.owner);
    const recipientId = typeof shareData.recipient === "object" ? (shareData.recipient.id || shareData.recipient._id) : (shareData.recipientId || shareData.recipient);
    const fileId = typeof shareData.file === "object" ? (shareData.file.id || shareData.file._id) : (shareData.fileId || shareData.file);

    const created = await prisma.internalShare.create({
      data: {
        ownerId: String(ownerId),
        recipientId: String(recipientId),
        fileId: String(fileId),
        permission: shareData.permission || "DOWNLOADER",
        status: shareData.status || "PENDING",
        message: shareData.message || "",
        expiresAt: shareData.expiresAt ? (shareData.expiresAt instanceof Date ? shareData.expiresAt : new Date(shareData.expiresAt)) : null,
        maxDownloads: shareData.maxDownloads !== undefined && shareData.maxDownloads !== null && shareData.maxDownloads !== "" ? Number(shareData.maxDownloads) : null
      }
    });
    return this.mapShare(created);
  }

  async findShareById(id) {
    if (!id) return null;
    const share = await prisma.internalShare.findUnique({
      where: { id: String(id) },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
        file: { include: { versions: { orderBy: { version: "asc" } } } }
      }
    });
    return this.mapShare(share);
  }

  async findReceivedShares(recipientId) {
    const shares = await prisma.internalShare.findMany({
      where: { recipientId: String(recipientId), status: { not: "REVOKED" } },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        file: { include: { versions: { orderBy: { version: "asc" } } } }
      },
      orderBy: { createdAt: "desc" }
    });
    return shares.map(s => this.mapShare(s));
  }

  async findSentShares(ownerId) {
    const shares = await prisma.internalShare.findMany({
      where: { ownerId: String(ownerId) },
      include: {
        recipient: { select: { id: true, name: true, email: true } },
        file: { include: { versions: { orderBy: { version: "asc" } } } }
      },
      orderBy: { createdAt: "desc" }
    });
    return shares.map(s => this.mapShare(s));
  }

  async updateShareStatus(id, status) {
    const updated = await prisma.internalShare.update({
      where: { id: String(id) },
      data: { status }
    });
    return this.mapShare(updated);
  }

  async incrementDownloadCount(id) {
    const updated = await prisma.internalShare.update({
      where: { id: String(id) },
      data: { downloadsCount: { increment: 1 } }
    });
    return this.mapShare(updated);
  }

  async searchUsersByEmailOrName(query) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } }
        ]
      },
      select: { id: true, name: true, email: true, role: true },
      take: 10
    });
    return users.map(u => ({ ...u, _id: u.id }));
  }
}

module.exports = new InternalShareRepository();
