const { Worker } = require("bullmq");

const connection = require("../config/redis");
const fileRepository = require("../repositories/file.repository");
const storageService = require("../services/storage.service");
const { encryptFile, calculateFileHash } = require("../utils/encryption.util");
const logger = require("../utils/logger");

/**
 * File Processing Worker — full pipeline per job:
 *
 *   Upload (multer saves locally)
 *       ↓
 *   If isZeroKnowledge:
 *       Step 1 · Skip Encrypt (client did it)
 *       Step 2 · Skip Hash calculation (client sent it)
 *       Step 3 · Upload to S3 (raw encrypted payload)
 *       Step 4 · Delete local copy
 *       Step 5 · Update MongoDB status to READY
 *   Else (Standard):
 *       Step 1 · Encrypt
 *       Step 2 · Generate SHA-256
 *       Step 3 · Upload to S3
 *       Step 4 · Delete local .enc
 *       Step 5 · Update MongoDB
 */
const worker = new Worker(
    "file-processing",

    async (job) => {
        const { fileId, path: localPath, storedName, version } = job.data;

        logger.info(`[WORKER] Job ${job.id} started — fileId: ${fileId}, version: ${version}`);

        try {
            // Fetch version metadata to check isZeroKnowledge flag
            const file = await fileRepository.getFileById(fileId);
            if (!file) {
                throw new Error("File metadata not found");
            }

            const versionDoc = file.versions.find(v => v.version === version);
            if (!versionDoc) {
                throw new Error(`Version ${version} metadata not found`);
            }

            let s3Key;
            let hash;
            let iv;

            let encryptedPath = null;

            if (versionDoc.isZeroKnowledge) {
                logger.info(`[WORKER] Detected Zero-Knowledge file. Bypassing encryption and hash generation.`);
                
                hash = versionDoc.hash;
                iv = versionDoc.iv;

                // Upload the client-encrypted file directly to S3
                s3Key = await storageService.uploadFile(
                    localPath,
                    job.data.s3Key || storedName
                );
                logger.info(`[WORKER] Zero-Knowledge Step 3 ✓ Uploaded raw encrypted file to S3 → ${s3Key}`);

                // Mark READY
                await fileRepository.updateVersionStatus(fileId, version, {
                    s3Key,
                    status: "READY"
                });
                logger.info(`[WORKER] Zero-Knowledge Step 5 ✓ MongoDB updated to READY`);

            } else {
                // ── Step 1: Encrypt ──────────────────────────────────────────────
                const encrypted = await encryptFile(localPath);
                encryptedPath = encrypted.path;
                logger.info(`[WORKER] Step 1 ✓ Encrypted → ${encrypted.path}`);

                // ── Step 2: Generate SHA-256 ─────────────────────────────────────
                hash = await calculateFileHash(encrypted.path);
                logger.info(`[WORKER] Step 2 ✓ SHA-256: ${hash}`);

                // ── Step 3: Upload to AWS S3 ─────────────────────────────────────
                s3Key = await storageService.uploadFile(
                    encrypted.path,
                    job.data.s3Key || storedName
                );
                logger.info(`[WORKER] Step 3 ✓ Uploaded to S3 → ${s3Key}`);

                // ── Step 5: Update MongoDB version sub-document ──────────────────
                await fileRepository.updateVersionStatus(fileId, version, {
                    s3Key,
                    hash,
                    iv: encrypted.iv,
                    status: "READY"
                });
                logger.info(`[WORKER] Step 5 ✓ MongoDB version ${version} updated (s3Key: ${s3Key})`);
            }

            logger.info(`[WORKER] Job ${job.id} complete — version ${version} READY ✅`);

        } catch (error) {
            // Mark the specific version FAILED, then re-throw so BullMQ can retry
            await fileRepository.updateVersionStatus(fileId, version, { status: "FAILED" });
            logger.error(`[WORKER] Job ${job.id} failed: ${error.message}`);
            throw error;
        } finally {
            if (localPath) storageService.deleteLocalFile(localPath);
            if (encryptedPath) storageService.deleteLocalFile(encryptedPath);
        }
    },

    {
        connection,
        concurrency: 5,
        skipVersionCheck: true
    }
);

// ── Error Event Handler ──────────────────────────────────────────────────────
worker.on("failed", (job, err) => {
    logger.error(`[WORKER] Job ${job?.id} permanently failed: ${err.message}`);
});

module.exports = worker;
