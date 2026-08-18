const crypto = require("crypto");
const fs = require("fs");
const qrSessionRepository = require("../repositories/qrSession.repository");
const fileRepository = require("../repositories/file.repository");
const auditService = require("./audit.service");
const storageService = require("./storage.service");
const { decryptFile } = require("../utils/encryption.util");
const { generateFileHash } = require("../utils/hash.util");
const AppError = require("../Error/AppError");

const os = require("os");

function getLocalIpAddress() {
  try {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const devName in interfaces) {
      const lowerName = devName.toLowerCase();

      // Skip virtual adapters (Docker, WSL, VirtualBox, VMware, vEthernet, Hyper-V)
      if (
        lowerName.includes("virtual") ||
        lowerName.includes("vbox") ||
        lowerName.includes("veth") ||
        lowerName.includes("wsl") ||
        lowerName.includes("vethernet") ||
        lowerName.includes("vmnet") ||
        lowerName.includes("hyper-v") ||
        lowerName.includes("loopback")
      ) {
        continue;
      }

      const iface = interfaces[devName];
      for (const alias of iface) {
        if (alias.family === "IPv4" && !alias.internal) {
          const ip = alias.address;
          const mac = (alias.mac || "").toLowerCase();

          // Exclude VirtualBox / Hyper-V subnets and link-local / APIPA
          if (
            ip.startsWith("192.168.56.") ||
            ip.startsWith("169.254.") ||
            ip.startsWith("172.17.") ||
            ip.startsWith("172.18.") ||
            ip.startsWith("172.19.")
          ) {
            continue;
          }

          if (
            mac.startsWith("0a:00:27") ||
            mac.startsWith("08:00:27") ||
            mac.startsWith("00:15:5d")
          ) {
            continue;
          }

          let score = 0;
          if (lowerName.includes("wi-fi") || lowerName.includes("wifi") || lowerName.includes("wireless") || lowerName.includes("wlan")) {
            score += 10;
          }
          if (lowerName.includes("ethernet") || lowerName.includes("eth") || lowerName.includes("en")) {
            score += 5;
          }

          candidates.push({ ip, score });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length > 0) return candidates[0].ip;
  } catch {}
  return "localhost";
}

class QRSessionService {
  async createQRSession(userId, fileId, options = {}) {
    const file = await fileRepository.getFileById(fileId);
    if (!file) {
      throw new AppError("File not found", 404);
    }

    const fileOwner = (file.ownerId || file.owner)?.toString();
    const reqUserId = (userId?.id || userId?._id || userId)?.toString();
    if (fileOwner && reqUserId && fileOwner !== reqUserId) {
      throw new AppError("You do not own this file", 403);
    }

    const targetVersionNum = options.version ? Number(options.version) : file.currentVersion;
    const version = (file.versions || []).find(v => v.version === targetVersionNum) || file.versions?.[0];

    if (!version) {
      throw new AppError(`Version ${targetVersionNum} not found`, 404);
    }

    const sessionId = `qr_${crypto.randomBytes(16).toString("hex")}`;
    const nonce = crypto.randomBytes(16).toString("hex");
    const ttlSeconds = options.ttlSeconds ? Number(options.ttlSeconds) : 60;

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    let frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    if (frontendUrl.includes("localhost") || frontendUrl.includes("127.0.0.1")) {
      const lanIp = getLocalIpAddress();
      if (lanIp !== "localhost") {
        frontendUrl = frontendUrl.replace("localhost", lanIp).replace("127.0.0.1", lanIp);
      }
    }

    const qrPayload = `${frontendUrl}/qr/scan?sessionId=${sessionId}&nonce=${nonce}`;

    const sessionData = {
      sessionId,
      fileId: file._id.toString(),
      createdBy: userId.toString(),
      status: "ACTIVE",
      nonce,
      versionNum: targetVersionNum,
      filename: file.originalName,
      mimeType: version.mimeType || "application/octet-stream",
      size: version.size,
      createdAt: new Date().toISOString(),
      expiresAt,
      maxDownloads: 1,
      downloadCount: 0
    };

    await qrSessionRepository.createSession(sessionData, ttlSeconds);

    await auditService.logAction({
      user: userId,
      action: "QR_CREATED",
      resourceId: file._id,
      details: { sessionId, filename: file.originalName, expiresAt }
    });

    return {
      success: true,
      sessionId,
      nonce,
      expiresAt,
      qrPayload,
      filename: file.originalName,
      fileSize: version.size
    };
  }

  async scanQRSession(sessionId, nonce, clientIp = "127.0.0.1", userAgent = null) {
    const session = await qrSessionRepository.getSession(sessionId);

    if (!session) {
      await auditService.logAction({
        user: null,
        action: "QR_EXPIRED",
        status: "FAILED",
        ip: clientIp,
        userAgent,
        details: { sessionId }
      });
      throw new AppError("QR share session has expired or is invalid", 404);
    }

    if (session.nonce !== nonce) {
      await auditService.logAction({
        user: null,
        action: "QR_AUTHENTICATION_FAILED",
        status: "FAILED",
        ip: clientIp,
        userAgent,
        details: { sessionId, reason: "Nonce mismatch" }
      });
      throw new AppError("Invalid QR security nonce", 401);
    }

    if (["CONSUMED", "REVOKED"].includes(session.status)) {
      throw new AppError(`QR session has already been ${session.status.toLowerCase()}`, 410);
    }

    const updated = await qrSessionRepository.updateSessionStatus(sessionId, "SCANNED", {
      scannedByIp: clientIp,
      scannedAt: new Date().toISOString()
    });

    await auditService.logAction({
      user: session.createdBy,
      action: "QR_SCANNED",
      ip: clientIp,
      userAgent,
      resourceId: session.fileId,
      details: { sessionId, filename: session.filename }
    });

    return updated || session;
  }

  async verifyQRSession(sessionId, nonce, userId, clientIp = "127.0.0.1") {
    const session = await qrSessionRepository.getSession(sessionId);
    if (!session) throw new AppError("QR session expired or invalid", 404);
    if (session.nonce !== nonce) throw new AppError("Invalid QR nonce", 401);

    if (["CONSUMED", "REVOKED"].includes(session.status)) {
      throw new AppError(`QR session has already been ${session.status.toLowerCase()}`, 410);
    }

    const updated = await qrSessionRepository.updateSessionStatus(sessionId, "AUTHENTICATED", {
      authenticatedUser: userId.toString(),
      authenticatedAt: new Date().toISOString()
    });

    await auditService.logAction({
      user: userId,
      action: "QR_AUTHENTICATION_SUCCESS",
      ip: clientIp,
      resourceId: session.fileId,
      details: { sessionId }
    });

    return updated || session;
  }

  async consumeQRSession(sessionId, nonce, userId = null, clientIp = "127.0.0.1") {
    // ATOMIC CONSUMPTION: Atomically transition status & delete session in Redis BEFORE file processing
    const { session, error } = await qrSessionRepository.atomicConsumeSession(sessionId, nonce);

    if (error) {
      if (error === "EXPIRED") {
        await auditService.logAction({
          user: userId,
          action: "QR_EXPIRED",
          status: "FAILED",
          ip: clientIp,
          details: { sessionId }
        });
        throw new AppError("QR session expired or invalid", 404);
      }
      if (error === "INVALID_NONCE") {
        await auditService.logAction({
          user: userId,
          action: "QR_AUTHENTICATION_FAILED",
          status: "FAILED",
          ip: clientIp,
          details: { sessionId, reason: "Nonce mismatch" }
        });
        throw new AppError("Invalid QR security nonce", 401);
      }
      if (error === "ALREADY_CONSUMED" || error === "MAX_DOWNLOADS_EXCEEDED") {
        throw new AppError("QR session has already been consumed or maximum downloads reached", 410);
      }
      throw new AppError("Failed to process QR session", 400);
    }

    const file = await fileRepository.getFileById(session.fileId);
    if (!file) throw new AppError("File not found", 404);

    const versionNum = session.versionNum || file.currentVersion;
    const version = file.versions.find(v => v.version === versionNum);
    if (!version || !version.s3Key) {
      throw new AppError("File storage payload unavailable", 500);
    }

    const encryptedTmpPath = await storageService.download(version.s3Key);

    if (version.isZeroKnowledge) {
      await auditService.logAction({
        user: userId || session.createdBy,
        action: "QR_CONSUMED",
        ip: clientIp,
        resourceId: file._id,
        details: { sessionId, isZeroKnowledge: true }
      });

      return {
        path: encryptedTmpPath,
        filename: file.originalName,
        mimeType: version.mimeType || "application/octet-stream",
        isZeroKnowledge: true,
        iv: version.iv
      };
    }

    if (!version.isZeroKnowledge && version.hash) {
      const currentHash = await generateFileHash(encryptedTmpPath);
      if (currentHash !== version.hash) {
        fs.unlink(encryptedTmpPath, () => {});
        throw new AppError("File integrity verification failed", 500);
      }
    }

    const decryptedPath = await decryptFile(encryptedTmpPath, file.originalName);
    fs.unlink(encryptedTmpPath, () => {});

    await auditService.logAction({
      user: userId || session.createdBy,
      action: "QR_CONSUMED",
      ip: clientIp,
      resourceId: file._id,
      details: { sessionId, filename: file.originalName }
    });

    return {
      path: decryptedPath,
      filename: file.originalName,
      mimeType: version.mimeType || "application/octet-stream",
      isZeroKnowledge: false,
      iv: version.iv
    };
  }

  async revokeQRSession(sessionId, userId, clientIp = "127.0.0.1") {
    const session = await qrSessionRepository.getSession(sessionId);
    if (!session) throw new AppError("QR session not found or already expired", 404);

    if (session.createdBy !== userId.toString()) {
      throw new AppError("Unauthorized to revoke this QR session", 403);
    }

    await qrSessionRepository.deleteSession(sessionId, userId);

    await auditService.logAction({
      user: userId,
      action: "QR_REVOKED",
      ip: clientIp,
      resourceId: session.fileId,
      details: { sessionId }
    });

    return { success: true, message: "QR session revoked successfully" };
  }

  async getAdminQRStats() {
    return await qrSessionRepository.getAdminStats();
  }
}

module.exports = new QRSessionService();
