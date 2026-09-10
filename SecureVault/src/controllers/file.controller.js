const fs = require("fs");
const fileService = require("../services/file.service");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../Error/AppError");
const virusScanner = require("../utils/virusScanner");

class FileController {

    upload = asyncHandler(async(req, res) => {

        if (!req.file) {
            throw new AppError("No file uploaded", 400);
        }

        // Run Virus Scan before database entry & encryption
        const scanResult = await virusScanner.scanFile(req.file.path);
        if (!scanResult.isSafe) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error("[SCANNER CLEANUP ERROR] Failed to delete infected file:", err.message);
            }
            throw new AppError("Virus Detected", 400);
        }

        const isZeroKnowledge = req.body.isZeroKnowledge === "true" || req.body.isZeroKnowledge === true || req.body.clientEncrypted === "true";
        const zkMetadata = {
            isZeroKnowledge,
            iv: req.body.iv || req.body["X-Client-IV"],
            hash: req.body.hash || req.body["X-Client-Hash"]
        };

        const uid = req.user?.id || req.user?._id;
        const file = await fileService.uploadFile(
            req.file,
            uid,
            zkMetadata
        );


        const latestVersion = file.versions[file.versions.length - 1];


        res.status(202).json({
            success: true,
            message: `File uploaded as Version ${file.currentVersion} — queued for processing`,
            status: "PROCESSING",
            data: {
                _id: file.id || file._id,
                id: file.id || file._id,
                originalName: file.originalName,
                currentVersion: file.currentVersion,
                version: latestVersion
            }
        });

    });

    getMyFiles = asyncHandler(async(req, res) => {
        const uid = req.user?.id || req.user?._id;
        const files = await fileService.getMyFiles(uid);

        res.status(200).json({
            success: true,
            data: files
        });

    });

    /**
     * GET /api/files/:id/versions
     * Returns the full versions list for a file.
     */
    getVersions = asyncHandler(async(req, res) => {
        const uid = req.user?.id || req.user?._id;
        const data = await fileService.getFileVersions(
            req.params.id,
            uid
        );

        res.status(200).json({
            success: true,
            data
        });

    });

    /**
     * GET /api/files/download/:id?version=N
     * Downloads a specific version (defaults to currentVersion).
     */
    download = asyncHandler(async(req, res) => {
        const fs = require("fs");
        const uid = req.user?.id || req.user?._id;
        const result = await fileService.downloadFile(
            req.params.id,
            uid,
            req.query.version, // optional; undefined → currentVersion
            {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                masked: req.query.masked !== undefined
                    ? (req.query.masked === "true" || req.query.redacted === "true")
                    : undefined
            }
        );

        const mimeType = result.mimeType || "application/octet-stream";
        const encodedName = encodeURIComponent(result.originalName);

        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${result.originalName}"; filename*=UTF-8''${encodedName}`);

        if (result.isZeroKnowledge) {
            res.setHeader("X-Zero-Knowledge", "true");
            res.setHeader("X-File-IV", result.iv || "");
        }

        if (result.isMasked) {
            res.setHeader("X-Is-Masked", "true");
        }

        let cleanedUp = false;
        const cleanup = () => {
            if (!cleanedUp && result.decryptedPath) {
                cleanedUp = true;
                fs.unlink(result.decryptedPath, () => {});
            }
        };

        const fileStream = fs.createReadStream(result.decryptedPath);
        fileStream.pipe(res);

        fileStream.on("error", (err) => {
            cleanup();
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: "Error streaming file" });
            }
        });

        res.on("finish", cleanup);
        res.on("close", cleanup);

    });

    /**
     * POST /api/files/:id/restore
     * Body: { version: N }
     * Creates a new version that is a copy of the specified version.
     */
    restore = asyncHandler(async(req, res) => {

        const { version } = req.body;

        if (!version) {
            throw new AppError("version is required in request body", 400);
        }

        const data = await fileService.restoreVersion(
            req.params.id,
            req.user._id,
            version
        );

        res.status(200).json({
            success: true,
            message: data.message,
            data: {
                currentVersion: data.currentVersion,
                versions: data.versions
            }
        });

    });

    /**
     * PATCH /api/files/:id/favorite
     */
    toggleFavorite = asyncHandler(async(req, res) => {
        const fileRepository = require("../repositories/file.repository");
        const file = await fileRepository.getFileById(req.params.id);
        const uid = (req.user?.id || req.user?._id)?.toString();
        const owner = (file?.ownerId || file?.owner)?.toString();
        if (!file || (owner && uid && owner !== uid)) {
            throw new AppError("File not found", 404);
        }
        const updated = await fileRepository.toggleFavorite(req.params.id);
        res.status(200).json({
            success: true,
            data: updated
        });
    });

    /**
     * GET /api/files/favorites
     */
    getFavorites = asyncHandler(async(req, res) => {
        const fileRepository = require("../repositories/file.repository");
        const uid = req.user?.id || req.user?._id;
        const files = await fileRepository.getFavorites(uid);
        res.status(200).json({
            success: true,
            data: files
        });
    });

    /**
     * GET /api/files/trash
     */
    getTrash = asyncHandler(async(req, res) => {
        const fileRepository = require("../repositories/file.repository");
        const uid = req.user?.id || req.user?._id;
        const files = await fileRepository.getTrash(uid);
        res.status(200).json({
            success: true,
            data: files
        });
    });

    /**
     * DELETE /api/files/:id/trash (or DELETE /api/files/:id)
     * Soft-deletes a file to trash bin.
     */
    moveToTrash = asyncHandler(async(req, res) => {
        const fileRepository = require("../repositories/file.repository");
        const file = await fileRepository.getFileById(req.params.id);
        const uid = (req.user?.id || req.user?._id)?.toString();
        const owner = (file?.ownerId || file?.owner)?.toString();
        if (!file || (owner && uid && owner !== uid)) {
            throw new AppError("File not found", 404);
        }
        const updated = await fileRepository.moveToTrash(req.params.id);
        res.status(200).json({
            success: true,
            message: "File moved to trash",
            data: updated
        });
    });

    /**
     * POST /api/files/:id/restore-trash
     */
    restoreFromTrash = asyncHandler(async(req, res) => {
        const fileRepository = require("../repositories/file.repository");
        const file = await fileRepository.getFileById(req.params.id);
        const uid = (req.user?.id || req.user?._id)?.toString();
        const owner = (file?.ownerId || file?.owner)?.toString();
        if (!file || (owner && uid && owner !== uid)) {
            throw new AppError("File not found", 404);
        }
        const updated = await fileRepository.restoreFromTrash(req.params.id);
        res.status(200).json({
            success: true,
            message: "File restored from trash",
            data: updated
        });
    });

    /**
     * GET /api/files/storage-stats
     */
    getStorageStats = asyncHandler(async(req, res) => {
        const fileRepository = require("../repositories/file.repository");
        const uid = req.user?.id || req.user?._id;
        const stats = await fileRepository.getStorageStats(uid);
        res.status(200).json({
            success: true,
            data: stats
        });
    });

    /**
     * DELETE /api/files/:id
     * Deletes a file permanently.
     */
    delete = asyncHandler(async(req, res) => {
        const result = await fileService.deleteFile(
            req.params.id,
            req.user._id
        );

        res.status(200).json({
            success: true,
            message: result.message
        });

    });

    /**
     * GET /api/files/:id/scan-pii
     * Decrypts the file and runs a live PII scan on the actual content.
     * Used by ShareModal "Re-Check PII" button.
     */
    scanPii = asyncHandler(async (req, res) => {
        const fileId = req.params.id;
        const userId = req.user?._id || req.user?.id;

        const fileRepository = require("../repositories/file.repository");
        const storageService = require("../services/storage.service");
        const { decryptFile } = require("../utils/encryption.util");
        const { processFile } = require("../utils/redactor.util");

        const file = await fileRepository.getFileById(fileId);
        if (!file) throw new AppError("File not found", 404);

        const fileOwner = (file.ownerId || file.owner)?.toString();
        if (fileOwner && userId && fileOwner !== userId.toString()) {
            throw new AppError("Unauthorized", 403);
        }

        const latestVersion = (file.versions || [])[file.versions.length - 1];
        if (!latestVersion || !latestVersion.s3Key) {
            // Return stored metadata if file is not yet downloadable
            return res.json({
                success: true,
                data: {
                    hasPII: file.hasSensitiveData || false,
                    types: file.sensitiveTypes || [],
                    findingsCount: 0,
                    maskedAadhaar: file.maskedAadhaar || null,
                    source: "metadata"
                }
            });
        }

        // If file is still processing, return stored metadata
        if (latestVersion.status === "PROCESSING") {
            return res.json({
                success: true,
                data: {
                    hasPII: file.hasSensitiveData || false,
                    types: file.sensitiveTypes || [],
                    findingsCount: 0,
                    maskedAadhaar: file.maskedAadhaar || null,
                    source: "metadata"
                }
            });
        }

        let encryptedTmpPath = null;
        let decryptedPath = null;
        try {
            encryptedTmpPath = await storageService.download(latestVersion.s3Key);

            // For zero-knowledge files we can't scan server-side
            if (latestVersion.isZeroKnowledge) {
                return res.json({
                    success: true,
                    data: {
                        hasPII: false,
                        types: [],
                        findingsCount: 0,
                        maskedAadhaar: null,
                        source: "zero-knowledge-skipped"
                    }
                });
            }

            decryptedPath = await decryptFile(encryptedTmpPath, file.originalName);
            fs.unlink(encryptedTmpPath, () => {});
            encryptedTmpPath = null;

            const mimeType = latestVersion.mimeType || "application/octet-stream";
            const result = await processFile(decryptedPath, mimeType);

            // Clean up redacted preview file if created
            if (result.redactedPath) {
                try { fs.unlinkSync(result.redactedPath); } catch {}
            }

            // Update DB with scan result
            const prisma = require("../config/prisma");
            await prisma.file.update({
                where: { id: file.id || file._id },
                data: {
                    hasSensitiveData: result.hasPII,
                    sensitiveTypes: result.types || [],
                    maskedAadhaar: result.maskedAadhaar || file.maskedAadhaar || null
                }
            }).catch(() => {});

            return res.json({
                success: true,
                data: {
                    hasPII: result.hasPII,
                    types: result.types,
                    findingsCount: result.findings?.length || 0,
                    maskedAadhaar: result.maskedAadhaar,
                    documentType: result.documentType || null,
                    summary: result.summary || null,
                    source: result.source || "live-scan"
                }
            });

        } catch (err) {
            // Fallback: return stored metadata on error
            return res.json({
                success: true,
                data: {
                    hasPII: file.hasSensitiveData || false,
                    types: file.sensitiveTypes || [],
                    findingsCount: 0,
                    maskedAadhaar: file.maskedAadhaar || null,
                    source: "metadata-fallback",
                    error: err.message
                }
            });
        } finally {
            if (encryptedTmpPath) { try { fs.unlinkSync(encryptedTmpPath); } catch {} }
            if (decryptedPath) { try { fs.unlinkSync(decryptedPath); } catch {} }
        }
    });

}

module.exports = new FileController();