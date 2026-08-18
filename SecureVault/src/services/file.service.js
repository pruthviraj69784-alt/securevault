const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const fileRepository = require("../repositories/file.repository");
const fileJob = require("../jobs/file.job");
const storageService = require("./storage.service");
const { decryptFile } = require("../utils/encryption.util");
const { generateFileHash } = require("../utils/hash.util");
const AppError = require("../Error/AppError");

class FileService {

    /**
     * Upload a file, creating a new version if the same originalName already
     * exists for this user, otherwise creating a brand-new file document.
     */
    async uploadFile(file, userId, zkMetadata = {}) {

        // Check whether this user already owns a file with the same name
        const existing = await fileRepository.findByOwnerAndName(
            userId,
            file.originalname
        );

        const isZeroKnowledge = !!zkMetadata.isZeroKnowledge;
        const clientIv = zkMetadata.iv || null;
        const clientHash = zkMetadata.hash || null;

        let savedFile;
        let newVersionNumber;

        if (existing) {
            // ── Version bump ─────────────────────────────────────────────────
            newVersionNumber = existing.currentVersion + 1;

            const s3Key = `files/${existing._id}/v${newVersionNumber}/${file.filename}.enc`;

            const versionEntry = {
                version:         newVersionNumber,
                storedName:      file.filename,
                s3Key,
                size:            file.size,
                mimeType:        file.mimetype,
                iv:              clientIv,
                hash:            clientHash,
                status:          "PROCESSING",
                isZeroKnowledge
            };

            savedFile = await fileRepository.addVersion(existing._id, versionEntry);

            await fileJob.process({
                fileId:      existing._id,
                path:        file.path,
                storedName:  file.filename,
                s3Key,
                version:     newVersionNumber
            });

        } else {
            // ── Brand-new file ───────────────────────────────────────────────
            newVersionNumber = 1;
            const fileId  = new mongoose.Types.ObjectId();
            const s3Key   = `files/${fileId}/v1/${file.filename}.enc`;

            const fileData = {
                _id:            fileId,
                owner:          userId,
                originalName:   file.originalname,
                extension:      path.extname(file.originalname),
                currentVersion: 1,
                versions: [
                    {
                        version:         1,
                        storedName:      file.filename,
                        s3Key,
                        size:            file.size,
                        mimeType:        file.mimetype,
                        iv:              clientIv,
                        hash:            clientHash,
                        status:          "PROCESSING",
                        isZeroKnowledge
                    }
                ]
            };

            savedFile = await fileRepository.createFile(fileData);

            await fileJob.process({
                fileId:     fileId,
                path:       file.path,
                storedName: file.filename,
                s3Key,
                version:    1
            });
        }

        return savedFile;
    }

    async getMyFiles(userId) {
        return await fileRepository.getUserFiles(userId);
    }

    /**
     * Return the versions array for a file, checking ownership.
     */
    async getFileVersions(fileId, userId) {

        const file = await fileRepository.getFileById(fileId);

        if (!file) {
            throw new AppError("File not found", 404);
        }

        if (file.owner.toString() !== userId.toString()) {
            throw new AppError("Unauthorized", 403);
        }

        return {
            fileId:         file._id,
            originalName:   file.originalName,
            currentVersion: file.currentVersion,
            versions:       file.versions
        };
    }

    /**
     * Download a specific version (defaults to currentVersion).
     *
     * Flow:
     *   1. Fetch metadata
     *   2. Authorise & resolve target version
     *   3. Download encrypted file from S3 → local temp path
     *   4. Verify SHA-256 integrity
     *   5. Decrypt (unless file is Zero-Knowledge encrypted)
     *   6. Return decrypted path (or raw encrypted path for ZK) + original filename
     */
    async downloadFile(fileId, userId, versionNumber) {

        // ── 1. Fetch metadata ─────────────────────────────────────────────────
        const file = await fileRepository.getFileById(fileId);

        if (!file) {
            throw new AppError("File not found", 404);
        }

        // ── 2. Authorise ──────────────────────────────────────────────────────
        const isOwner = file.owner.toString() === userId.toString();
        if (!isOwner) {
            const internalShareRepository = require("../repositories/internalShare.repository");
            const shares = await internalShareRepository.findReceivedShares(userId);
            const matchingShare = shares.find(s => {
                const fId = s.file?._id || s.file?.id || s.fileId || s.file;
                return fId && fId.toString() === fileId.toString() && s.status !== "REVOKED" && s.status !== "DECLINED";
            });

            if (!matchingShare) {
                throw new AppError("Unauthorized", 403);
            }
        }

        // Resolve target version number
        const targetVersionNum = versionNumber
            ? Number(versionNumber)
            : file.currentVersion;

        const version = file.versions.find(v => v.version === targetVersionNum);

        if (!version) {
            throw new AppError(`Version ${targetVersionNum} not found`, 404);
        }

        if (version.status !== "READY") {
            throw new AppError(`Version ${targetVersionNum} is still processing`, 409);
        }

        if (!version.s3Key) {
            throw new AppError("File storage reference is missing", 500);
        }

        // ── 3. Download encrypted file from S3 ───────────────────────────────
        const encryptedTmpPath = await storageService.download(version.s3Key);

        // ── 4. Verify SHA-256 integrity (for standard server-encrypted files) ──
        if (!version.isZeroKnowledge && version.hash) {
            const currentHash = await generateFileHash(encryptedTmpPath);
            if (currentHash !== version.hash) {
                fs.unlink(encryptedTmpPath, () => {});
                throw new AppError("File integrity verification failed", 500);
            }
        }

        // ── 5. Zero-Knowledge / Server-side Decrypt ──────────────────────────
        if (version.isZeroKnowledge) {
            // Server bypasses decryption, returns raw encrypted file
            return {
                decryptedPath:   encryptedTmpPath,
                originalName:    file.originalName,
                mimeType:        version.mimeType,
                isZeroKnowledge: true,
                iv:              version.iv
            };
        }

        // Server-side decrypt for normal files
        const decryptedPath = await decryptFile(encryptedTmpPath, file.originalName);
        fs.unlink(encryptedTmpPath, () => {});

        // ── 6. Return ─────────────────────────────────────────────────────────
        return {
            decryptedPath,
            originalName: file.originalName,
            mimeType:     version.mimeType,
            isZeroKnowledge: false,
            iv:           version.iv
        };
    }

    /**
     * Restore a previous version by creating a new version entry that points
     * to the same S3 object as the source version (no re-encryption needed).
     */
    async restoreVersion(fileId, userId, versionNumber) {

        const file = await fileRepository.getFileById(fileId);

        if (!file) {
            throw new AppError("File not found", 404);
        }

        if (file.owner.toString() !== userId.toString()) {
            throw new AppError("Unauthorized", 403);
        }

        const sourceVersion = file.versions.find(
            v => v.version === Number(versionNumber)
        );

        if (!sourceVersion) {
            throw new AppError(`Version ${versionNumber} not found`, 404);
        }

        if (sourceVersion.status !== "READY") {
            throw new AppError(`Version ${versionNumber} is not ready`, 409);
        }

        const newVersionNumber = file.currentVersion + 1;

        const restoredEntry = {
            version:         newVersionNumber,
            storedName:      sourceVersion.storedName,
            s3Key:           sourceVersion.s3Key,      // reuse same S3 object
            size:            sourceVersion.size,
            mimeType:        sourceVersion.mimeType,
            iv:              sourceVersion.iv,
            hash:            sourceVersion.hash,
            status:          "READY",                  // already encrypted & verified
            isZeroKnowledge: sourceVersion.isZeroKnowledge
        };

        const updated = await fileRepository.addVersion(fileId, restoredEntry);

        return {
            message:        `Version ${versionNumber} restored as Version ${newVersionNumber}`,
            currentVersion: updated.currentVersion,
            versions:       updated.versions
        };
    }

    /**
     * Delete a file and all its versions from S3 and the database.
     * Only the owner can delete their own file.
     */
    async deleteFile(fileId, userId) {

        const file = await fileRepository.getFileById(fileId);

        if (!file) {
            throw new AppError("File not found", 404);
        }

        if (file.owner.toString() !== userId.toString()) {
            throw new AppError("Unauthorized", 403);
        }

        // Delete every version's S3 object
        for (const version of file.versions) {
            if (version.s3Key) {
                try {
                    await storageService.deleteFile(version.s3Key);
                } catch (err) {
                    // Log but don't block — we still want to remove the DB record
                    const logger = require("../utils/logger");
                    logger.warn(`[DELETE] Failed to remove S3 key ${version.s3Key}: ${err.message}`);
                }
            }
        }

        await fileRepository.deleteFile(fileId);

        return { message: `File "${file.originalName}" deleted successfully` };
    }

}

module.exports = new FileService();