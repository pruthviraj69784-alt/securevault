const fs = require("fs");
const internalShareRepository = require("../repositories/internalShare.repository");
const fileRepository = require("../repositories/file.repository");
const userRepository = require("../repositories/user.repository");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");
const AppError = require("../Error/AppError");

class InternalShareService {
  async searchUsers(query, currentUserId) {
    if (!query || query.trim().length === 0) return [];
    const users = await internalShareRepository.searchUsersByEmailOrName(query);
    return users.filter(u => (u._id || u.id).toString() !== currentUserId.toString());
  }

  async createInternalShare(ownerId, { recipientEmail, fileId, permission, message, expiresAt, maxDownloads }) {
    const recipient = await userRepository.findByEmail(recipientEmail);
    if (!recipient) {
      throw new AppError("Recipient user not found in SecureVault", 404);
    }

    const recipientId = (recipient.id || recipient._id)?.toString();
    const reqOwnerId = (ownerId?.id || ownerId?._id || ownerId)?.toString();

    if (recipientId === reqOwnerId) {
      throw new AppError("Cannot share a file with yourself", 400);
    }

    const targetFileId = typeof fileId === "object" ? (fileId?.id || fileId?._id) : fileId;
    const file = await fileRepository.getFileById(targetFileId);
    if (!file) {
      throw new AppError("File not found", 404);
    }

    const fileOwner = (file.ownerId || file.owner)?.toString();
    if (fileOwner && reqOwnerId && fileOwner !== reqOwnerId) {
      throw new AppError("You do not own this file", 403);
    }

    const share = await internalShareRepository.createShare({
      owner: reqOwnerId,
      recipient: recipientId,
      file: targetFileId,
      permission: permission || "DOWNLOADER",
      message: message || "",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxDownloads: maxDownloads ? Number(maxDownloads) : null,
      status: "PENDING"
    });

    await auditService.logAction({
      user: ownerId,
      action: "SHARE_INTERNAL_CREATED",
      resourceId: fileId,
      details: { recipientEmail, permission }
    });

    await notificationService.notify({
      userId: recipient._id,
      title: "File Shared With You",
      message: `A file (${file.originalName}) was shared with you.`,
      type: "FILE_SHARED",
      priority: "NORMAL",
      actionUrl: "/shares/with-me",
      metadata: { shareId: share._id, fileId }
    });

    return share;
  }

  async getReceivedShares(userId) {
    return await internalShareRepository.findReceivedShares(userId);
  }

  async getSentShares(userId) {
    return await internalShareRepository.findSentShares(userId);
  }

  async respondToShare(shareId, userId, action) {
    const share = await internalShareRepository.findShareById(shareId);
    if (!share) {
      throw new AppError("Internal share record not found", 404);
    }

    if (share.recipient._id.toString() !== userId.toString()) {
      throw new AppError("Unauthorized to modify this share", 403);
    }

    const status = action === "ACCEPT" ? "ACCEPTED" : "DECLINED";
    const updated = await internalShareRepository.updateShareStatus(shareId, status);

    await auditService.logAction({
      user: userId,
      action: `SHARE_INTERNAL_${status}`,
      resourceId: share.file._id,
      details: { shareId }
    });

    await notificationService.notify({
      userId: share.owner._id,
      title: `Share ${status === "ACCEPTED" ? "Accepted" : "Declined"}`,
      message: `${share.recipient.name || share.recipient.email} ${status.toLowerCase()} your share for ${share.file?.originalName || "file"}.`,
      type: status === "ACCEPTED" ? "SHARE_ACCEPTED" : "SHARE_DECLINED",
      priority: "NORMAL",
      actionUrl: "/shares/by-me",
      metadata: { shareId, recipientId: userId }
    });

    return updated;
  }

  async revokeShare(shareId, userId) {
    const share = await internalShareRepository.findShareById(shareId);
    if (!share) {
      throw new AppError("Share record not found", 404);
    }

    if (share.owner._id.toString() !== userId.toString()) {
      throw new AppError("Unauthorized to revoke this share", 403);
    }

    const updated = await internalShareRepository.updateShareStatus(shareId, "REVOKED");

    await auditService.logAction({
      user: userId,
      action: "SHARE_INTERNAL_REVOKED",
      resourceId: share.file._id,
      details: { shareId }
    });

    await notificationService.notify({
      userId: share.recipient._id,
      title: "Share Access Revoked",
      message: `Access to ${share.file?.originalName || "shared file"} was revoked by owner.`,
      type: "SHARE_REVOKED",
      priority: "HIGH",
      actionUrl: "/shares/with-me",
      metadata: { shareId }
    });

    return updated;
  }

  async downloadSharedFile(shareId, userId) {
    const share = await internalShareRepository.findShareById(shareId);
    if (!share) {
      throw new AppError("Internal share record not found", 404);
    }

    if (share.recipient._id.toString() !== userId.toString()) {
      throw new AppError("Unauthorized access to this shared file", 403);
    }

    if (share.status === "REVOKED" || share.status === "DECLINED") {
      throw new AppError("This share has been revoked or declined", 403);
    }

    if (share.status === "PENDING") {
      await internalShareRepository.updateShareStatus(shareId, "ACCEPTED");
    }

    if (share.permission === "VIEWER") {
      throw new AppError("Viewer permission does not allow downloading", 403);
    }

    if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
      throw new AppError("This share link has expired", 410);
    }

    if (share.maxDownloads && share.downloadsCount >= share.maxDownloads) {
      throw new AppError("Maximum download limit reached for this share", 410);
    }

    const file = share.file;
    if (!file || !file.versions || file.versions.length === 0) {
      throw new AppError("File content unavailable", 404);
    }

    await internalShareRepository.incrementDownloadCount(shareId);

    await auditService.logAction({
      user: userId,
      action: "SHARE_INTERNAL_DOWNLOAD",
      resourceId: file._id,
      details: { shareId, permission: share.permission }
    });

    const latestVersion = file.versions[file.versions.length - 1];
    if (!latestVersion || !latestVersion.s3Key) {
      throw new AppError("File storage reference is missing", 500);
    }

    const storageService = require("./storage.service");
    const { decryptFile } = require("../utils/encryption.util");
    const { generateFileHash } = require("../utils/hash.util");

    const encryptedTmpPath = await storageService.download(latestVersion.s3Key);

    if (latestVersion.isZeroKnowledge) {
      return {
        path: encryptedTmpPath,
        filename: file.originalName,
        mimeType: latestVersion.mimeType || "application/octet-stream",
        isZeroKnowledge: true,
        iv: latestVersion.iv
      };
    }

    if (!latestVersion.isZeroKnowledge && latestVersion.hash) {
      const currentHash = await generateFileHash(encryptedTmpPath);
      if (currentHash !== latestVersion.hash) {
        fs.unlink(encryptedTmpPath, () => {});
        throw new AppError("File integrity verification failed", 500);
      }
    }

    const decryptedPath = await decryptFile(encryptedTmpPath, file.originalName);
    fs.unlink(encryptedTmpPath, () => {});

    return {
      path: decryptedPath,
      filename: file.originalName,
      mimeType: latestVersion.mimeType || "application/octet-stream",
      isZeroKnowledge: false,
      iv: latestVersion.iv
    };
  }
}

module.exports = new InternalShareService();
