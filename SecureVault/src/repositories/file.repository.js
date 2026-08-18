const prisma = require("../config/prisma");

class FileRepository {
  mapFile(file) {
    if (!file) return null;
    return {
      ...file,
      _id: file.id,
      owner: file.ownerId,
      versions: (file.versions || []).map(v => ({
        ...v,
        _id: v.id
      }))
    };
  }

  async createFile(fileData) {
    const versionData = fileData.versions?.[0] || {};
    const created = await prisma.file.create({
      data: {
        id: fileData._id ? String(fileData._id) : undefined,
        ownerId: String(fileData.owner),
        originalName: fileData.originalName,
        extension: fileData.extension,
        currentVersion: Number(fileData.currentVersion) || 1,
        category: fileData.category || "others",
        isFavorite: fileData.isFavorite || false,
        isTrashed: fileData.isTrashed || false,
        versions: {
          create: [{
            version: Number(versionData.version) || 1,
            storedName: versionData.storedName,
            s3Key: versionData.s3Key,
            size: Number(versionData.size) || 0,
            mimeType: versionData.mimeType || "application/octet-stream",
            iv: versionData.iv || null,
            hash: versionData.hash || null,
            status: versionData.status || "PROCESSING",
            isZeroKnowledge: versionData.isZeroKnowledge || false
          }]
        }
      },
      include: { versions: { orderBy: { version: "asc" } } }
    });
    return this.mapFile(created);
  }

  async getUserFiles(userId) {
    const files = await prisma.file.findMany({
      where: { ownerId: String(userId), isTrashed: false },
      include: { versions: { orderBy: { version: "asc" } } },
      orderBy: { updatedAt: "desc" }
    });
    return files.map(f => this.mapFile(f));
  }

  async getFavorites(userId) {
    const files = await prisma.file.findMany({
      where: { ownerId: String(userId), isFavorite: true, isTrashed: false },
      include: { versions: { orderBy: { version: "asc" } } },
      orderBy: { updatedAt: "desc" }
    });
    return files.map(f => this.mapFile(f));
  }

  async getTrash(userId) {
    const files = await prisma.file.findMany({
      where: { ownerId: String(userId), isTrashed: true },
      include: { versions: { orderBy: { version: "asc" } } },
      orderBy: { trashedAt: "desc" }
    });
    return files.map(f => this.mapFile(f));
  }

  async toggleFavorite(fileId) {
    const file = await prisma.file.findUnique({ where: { id: String(fileId) } });
    if (!file) return null;

    const updated = await prisma.file.update({
      where: { id: String(fileId) },
      data: { isFavorite: !file.isFavorite },
      include: { versions: { orderBy: { version: "asc" } } }
    });
    return this.mapFile(updated);
  }

  async moveToTrash(fileId) {
    const updated = await prisma.file.update({
      where: { id: String(fileId) },
      data: { isTrashed: true, trashedAt: new Date() },
      include: { versions: { orderBy: { version: "asc" } } }
    });
    return this.mapFile(updated);
  }

  async restoreFromTrash(fileId) {
    const updated = await prisma.file.update({
      where: { id: String(fileId) },
      data: { isTrashed: false, trashedAt: null },
      include: { versions: { orderBy: { version: "asc" } } }
    });
    return this.mapFile(updated);
  }

  async getStorageStats(userId) {
    const files = await prisma.file.findMany({
      where: { ownerId: String(userId), isTrashed: false },
      include: { versions: { orderBy: { version: "asc" } } }
    });

    const breakdown = { documents: 0, images: 0, videos: 0, others: 0, total: 0 };
    files.forEach(file => {
      const latest = file.versions?.[file.versions.length - 1];
      const size = latest?.size || 0;
      const cat = file.category || "others";
      breakdown[cat] = (breakdown[cat] || 0) + size;
      breakdown.total += size;
    });

    return breakdown;
  }

  async getFileById(id) {
    if (!id) return null;
    const fileId = typeof id === "object" ? (id.id || id._id) : id;
    if (!fileId || typeof fileId !== "string") return null;
    const file = await prisma.file.findUnique({
      where: { id: String(fileId) },
      include: { versions: { orderBy: { version: "asc" } } }
    });
    return this.mapFile(file);
  }

  async findByOwnerAndName(userId, originalName) {
    const file = await prisma.file.findFirst({
      where: { ownerId: String(userId), originalName, isTrashed: false },
      include: { versions: { orderBy: { version: "asc" } } }
    });
    return this.mapFile(file);
  }

  async addVersion(fileId, versionData) {
    await prisma.fileVersion.create({
      data: {
        fileId: String(fileId),
        version: Number(versionData.version),
        storedName: versionData.storedName,
        s3Key: versionData.s3Key,
        size: Number(versionData.size) || 0,
        mimeType: versionData.mimeType || "application/octet-stream",
        iv: versionData.iv || null,
        hash: versionData.hash || null,
        status: versionData.status || "PROCESSING",
        isZeroKnowledge: versionData.isZeroKnowledge || false
      }
    });

    const updated = await prisma.file.update({
      where: { id: String(fileId) },
      data: {
        currentVersion: Number(versionData.version),
        isTrashed: false,
        trashedAt: null
      },
      include: { versions: { orderBy: { version: "asc" } } }
    });
    return this.mapFile(updated);
  }

  async updateVersionStatus(fileId, versionNumber, updateData) {
    await prisma.fileVersion.updateMany({
      where: { fileId: String(fileId), version: Number(versionNumber) },
      data: updateData
    });

    const updated = await prisma.file.findUnique({
      where: { id: String(fileId) },
      include: { versions: { orderBy: { version: "asc" } } }
    });
    return this.mapFile(updated);
  }

  async deleteFile(fileId) {
    await prisma.file.delete({
      where: { id: String(fileId) }
    });
    return true;
  }

  async create(fileData) {
    return await this.createFile(fileData);
  }
}

module.exports = new FileRepository();