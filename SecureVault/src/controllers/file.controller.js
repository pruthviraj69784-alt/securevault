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

        const file = await fileService.uploadFile(
            req.file,
            req.user._id,
            zkMetadata
        );


        const latestVersion = file.versions[file.versions.length - 1];


        res.status(202).json({
            success: true,
            message: `File uploaded as Version ${file.currentVersion} — queued for processing`,
            status: "PROCESSING",
            data: {
                _id: file._id,
                originalName: file.originalName,
                currentVersion: file.currentVersion,
                version: latestVersion
            }
        });

    });

    getMyFiles = asyncHandler(async(req, res) => {

        const files = await fileService.getMyFiles(req.user._id);

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

        const data = await fileService.getFileVersions(
            req.params.id,
            req.user._id
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
        const result = await fileService.downloadFile(
            req.params.id,
            req.user._id,
            req.query.version // optional; undefined → currentVersion
        );

        const mimeType = result.mimeType || "application/octet-stream";
        const encodedName = encodeURIComponent(result.originalName);

        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${result.originalName}"; filename*=UTF-8''${encodedName}`);

        if (result.isZeroKnowledge) {
            res.setHeader("X-Zero-Knowledge", "true");
            res.setHeader("X-File-IV", result.iv || "");
        }

        const fileStream = fs.createReadStream(result.decryptedPath);
        fileStream.pipe(res);

        fileStream.on("error", (err) => {
            fs.unlink(result.decryptedPath, () => {});
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: "Error streaming file" });
            }
        });

        res.on("finish", () => {
            fs.unlink(result.decryptedPath, () => {});
        });

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
        if (!file || file.owner.toString() !== req.user._id.toString()) {
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
        const files = await fileRepository.getFavorites(req.user._id);
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
        const files = await fileRepository.getTrash(req.user._id);
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
        if (!file || file.owner.toString() !== req.user._id.toString()) {
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
        if (!file || file.owner.toString() !== req.user._id.toString()) {
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
        const stats = await fileRepository.getStorageStats(req.user._id);
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

}

module.exports = new FileController();