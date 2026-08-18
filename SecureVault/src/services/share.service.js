const crypto = require("crypto");
const bcrypt = require("bcrypt");
const fs = require("fs");

const shareRepository = require("../repositories/share.repository");
const fileRepository = require("../repositories/file.repository");
const storageService = require("./storage.service");
const { decryptFile } = require("../utils/encryption.util");
const { generateFileHash } = require("../utils/hash.util");
const AppError = require("../Error/AppError");

class ShareService {

    async createShare(userId, body) {
        const targetFileId = typeof body.fileId === "object" ? (body.fileId?.id || body.fileId?._id) : (body.fileId || body.file);
        const file = await fileRepository.getFileById(targetFileId);

        if (!file) {
            throw new AppError("File not found", 404);
        }

        const fileOwner = (file.ownerId || file.owner)?.toString();
        const reqUserId = (userId?.id || userId?._id || userId)?.toString();
        if (fileOwner && reqUserId && fileOwner !== reqUserId) {
            throw new AppError("Unauthorized", 401);
        }

        // Resolve which version to share (default: currentVersion)
        const targetVersionNum = body.version ?
            Number(body.version) :
            file.currentVersion;

        const targetVersion = (file.versions || []).find(v => v.version === targetVersionNum) || file.versions?.[0];

        if (!targetVersion) {
            throw new AppError(`Version ${targetVersionNum} not found`, 404);
        }

        const token = crypto.randomBytes(32).toString("hex");

        let password = null;
        if (body.password) {
            password = await bcrypt.hash(body.password, 10);
        }

        let expiresAt;
        if (body.expiresAt) {
            expiresAt = new Date(body.expiresAt);
        } else {
            expiresAt = new Date();
            expiresAt.setHours(
                expiresAt.getHours() +
                (Number(body.expiresInHours) || 24)
            );
        }

        const share = await shareRepository.createShare({
            file: file._id || file.id,
            owner: userId,
            token,
            expiresAt,
            password,
            maxDownloads: body.maxDownloads !== undefined && body.maxDownloads !== null && body.maxDownloads !== "" ? Number(body.maxDownloads) : 1,
            allowedIP: body.allowedIP || null,
            // Store the pinned version so the share always serves the same content
            version: targetVersionNum
        });

        // Trigger Webhook Event asynchronously
        const userRepository = require("../repositories/user.repository");
        const webhookService = require("./webhook.service");
        const logger = require("../utils/logger");

        userRepository.findById(userId)
            .then(user => {
                if (user) {
                    webhookService.triggerEvent(userId, "FILE_SHARED", {
                        user: user.email,
                        filename: file.originalName
                    });
                }
            })
            .catch(err => {
                logger.error(`[WEBHOOK ERROR] Error trigger webhook: ${err.message}`);
            });

        return share;

    }

    async accessShare(token, password, ip, otp = null) {

        const share = await shareRepository.findByToken(token);

        if (!share)
            throw new AppError("Invalid share link", 404);

        if (!share.isActive)
            throw new AppError("Share link disabled", 403);

        if (new Date() > share.expiresAt)
            throw new AppError("Share link expired", 410);

        if (share.downloadCount >= share.maxDownloads)
            throw new AppError("Download limit exceeded", 403);

        // Normalize IPv6-mapped IPv4 and IPv6 loopback to standard IPv4
        let clientIP = ip.replace("::ffff:", "");
        if (clientIP === "::1") clientIP = "127.0.0.1";

        if (share.allowedIP && share.allowedIP !== clientIP)
            throw new AppError("IP not allowed", 403);

        if (share.password) {
            if (!password) {
                throw new AppError("Password required", 401);
            }
            const ok = await bcrypt.compare(password, share.password);
            if (!ok)
                throw new AppError("Wrong password", 401);
        }

        if (share.isOtpEnabled) {
            if (!otp) {
                throw new AppError("OTP required", 401);
            }
            const redis = require("../config/redis");
            const storedOtp = await redis.get(`otp:${token}`);
            if (!storedOtp || storedOtp !== otp) {
                throw new AppError("Invalid or expired OTP", 401);
            }
            await redis.del(`otp:${token}`);
        }

        const fileId = typeof share.file === "object" ? (share.file.id || share.file._id) : (share.fileId || share.file);
        const file = (typeof share.file === "object" && share.file.versions && share.file.versions.length > 0)
            ? share.file
            : await fileRepository.getFileById(fileId);

        if (!file) {
            throw new AppError("File not found", 404);
        }

        // Use the pinned version stored on the share record (fall back to currentVersion)
        const targetVersionNum = share.version || file.currentVersion;
        const version = (file.versions || []).find(v => v.version === targetVersionNum) || file.versions?.[0];

        if (!version) {
            throw new AppError(`Version ${targetVersionNum} not found`, 404);
        }

        if (version.status === "PROCESSING") {
            throw new AppError("File is still processing, please try again in a few moments", 409);
        }

        if (!version.s3Key) {
            throw new AppError("File storage reference is missing", 500);
        }

        // Download encrypted file from S3 to temp local path
        const encryptedTmpPath = await storageService.download(version.s3Key);

        // For zero-knowledge files, the client-encrypted payload is the object we should share.
        // Skip server-side decryption and integrity verification for this pass-through path.
        if (version.isZeroKnowledge) {
            await shareRepository.incrementDownload(share._id || share.id);

            return {
                path: encryptedTmpPath,
                filename: file.originalName,
                mimeType: version.mimeType || "application/octet-stream",
                isZeroKnowledge: true,
                iv: version.iv
            };
        }

        // Verify SHA-256 integrity for server-encrypted files (if hash is present)
        if (!version.isZeroKnowledge && version.hash) {
            const currentHash = await generateFileHash(encryptedTmpPath);
            if (currentHash !== version.hash) {
                fs.unlink(encryptedTmpPath, () => {});
                throw new AppError("File integrity verification failed", 500);
            }
        }

        // Decrypt the downloaded temp file
        const decryptedPath = await decryptFile(encryptedTmpPath, file.originalName);
        fs.unlink(encryptedTmpPath, () => {});

        await shareRepository.incrementDownload(share._id || share.id);

        return {
            path: decryptedPath,
            filename: file.originalName,
            mimeType: version.mimeType || "application/octet-stream",
            isZeroKnowledge: false,
            iv: version.iv
        };

    }

    async getShareInfo(token) {
        const share = await shareRepository.findByToken(token);

        if (!share)
            throw new AppError("Invalid share link", 404);

        if (!share.isActive)
            throw new AppError("Share link disabled", 403);

        if (new Date() > share.expiresAt)
            throw new AppError("Share link expired", 410);

        if (share.downloadCount >= share.maxDownloads)
            throw new AppError("Download limit exceeded", 403);

        const fileId = typeof share.file === "object" ? (share.file.id || share.file._id) : (share.fileId || share.file);
        const file = (typeof share.file === "object" && share.file.versions && share.file.versions.length > 0)
            ? share.file
            : await fileRepository.getFileById(fileId);

        if (!file) {
            throw new AppError("File not found", 404);
        }

        const targetVersionNum = share.version || file.currentVersion;
        const version = (file.versions || []).find(v => v.version === targetVersionNum) || file.versions?.[0];

        if (!version) {
            throw new AppError(`Version ${targetVersionNum} not found`, 404);
        }

        return {
            fileName: file.originalName,
            fileSize: version.size,
            isPasswordRequired: !!share.password,
            isOtpRequired: !!share.isOtpEnabled
        };
    }

    async sendOtp(token) {
        const share = await shareRepository.findByToken(token);
        if (!share) throw new AppError("Invalid share link", 404);

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const redis = require("../config/redis");
        await redis.set(`otp:${token}`, otpCode, "EX", 300);

        let recipientEmail = share.otpEmail;
        if (!recipientEmail) {
            const userRepository = require("../repositories/user.repository");
            const owner = await userRepository.findById(share.owner);
            recipientEmail = owner ? owner.email : null;
        }

        if (!recipientEmail) {
            throw new AppError("No recipient email configured for OTP verification", 400);
        }

        const emailJob = require("../jobs/email.job");
        await emailJob.send({
            to: recipientEmail,
            subject: "SecureVault Share Access OTP",
            html: `
                <h2>SecureVault Access OTP</h2>
                <p>Your one-time password to access the shared file is:</p>
                <h1 style="letter-spacing: 5px; font-family: monospace;">${otpCode}</h1>
                <p>This code will expire in 5 minutes.</p>
            `
        }).catch(err => {
            const logger = require("../utils/logger");
            logger.error(`[OTP EMAIL ERROR] Failed to send OTP email: ${err.message}`);
        });

        return { success: true };
    }

    async getSharedWithMe(userId) {
        const internalShareRepository = require("../repositories/internalShare.repository");
        const internalShares = await internalShareRepository.findReceivedShares(userId);
        return internalShares.map(s => ({
            ...s,
            shareType: "INTERNAL",
            sharedBy: s.owner || null,
            isZeroKnowledge: s.file?.versions?.[s.file.versions.length - 1]?.isZeroKnowledge || false,
        }));
    }

    async getSharedByMe(userId) {
        const internalShareRepository = require("../repositories/internalShare.repository");
        const externalShares = await shareRepository.findByOwner(userId);
        const internalShares = await internalShareRepository.findSentShares(userId);

        const ext = (externalShares || []).map(s => ({
            ...s,
            shareType: "EXTERNAL",
            recipientName: "Public Link",
            recipientEmail: "Anyone with link",
            downloadCount: s.downloadCount || 0,
            isZeroKnowledge: s.file?.versions?.[s.file.versions.length - 1]?.isZeroKnowledge || false,
        }));

        const int = (internalShares || []).map(s => ({
            ...s,
            shareType: "INTERNAL",
            token: null,
            recipientName: s.recipient?.name || s.recipient?.email || "Internal User",
            recipientEmail: s.recipient?.email || "",
            downloadCount: s.downloadsCount || 0,
            isZeroKnowledge: s.file?.versions?.[s.file.versions.length - 1]?.isZeroKnowledge || false,
        }));

        return [...ext, ...int].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    async revokeShare(shareId, userId) {
        const internalShareRepository = require("../repositories/internalShare.repository");
        try {
            return await internalShareRepository.updateShareStatus(shareId, "REVOKED");
        } catch {
            return await shareRepository.deactivate(shareId);
        }
    }

}

module.exports = new ShareService();