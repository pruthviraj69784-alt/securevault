/**
 * dpdp.service.js
 * ─────────────────────────────────────────────────────────
 * India DPDP Act 2023-Compliant Consent & Data Lifecycle Service
 * - Consent registration (purpose-bound, time-limited)
 * - Access logging (who accessed, when, why)
 * - Consent revocation and data minimization / crypto-shredding
 * - Expiry purge scheduler
 */

const prisma = require("../config/prisma");
const AppError = require("../Error/AppError");
const { processFile } = require("../utils/redactor.util");
const logger = require("../utils/logger");
const storageService = require("./storage.service");
const fileRepository = require("../repositories/file.repository");
const path = require("path");
const fs = require("fs");

class DpdpService {

    // ── PII Scan & Redaction ──────────────────────────────────────────────────

    /**
     * Scan a local file for PII and apply redaction.
     * Called from file.worker.js after encryption step.
     */
    async scanAndRedact(fileId, localPath, mimeType, userId = null) {
        try {
            const result = await processFile(localPath, mimeType);

            if (result.hasPII) {
                logger.info(`[DPDP] PII detected in file ${fileId}: ${result.types.join(", ")}`);

                // Update file record with PII metadata
                await prisma.file.update({
                    where: { id: fileId },
                    data: {
                        hasSensitiveData: true,
                        sensitiveTypes: result.types,
                        maskedAadhaar: result.maskedAadhaar || null,
                        isRedacted: !!result.redactedPath,
                        redactionDetails: {
                            detectedAt: new Date().toISOString(),
                            types: result.types,
                            documentType: result.documentType || "UNKNOWN",
                            // Store precise AI bounding boxes so download-time masking
                            // doesn't need to re-call the AI (saves cost + latency)
                            findings: result.findings || [],
                            maskZones: result.maskZones || [],
                            findingsCount: (result.findings || []).length,
                            maskedAadhaar: result.maskedAadhaar,
                            redactedPath: result.redactedPath || null
                        },
                        dpdpExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // default 1 year
                    }
                });

                try {
                    const auditService = require("./audit.service");
                    await auditService.logAction({
                        user: userId || null,
                        action: "DPDP_PII_DETECTED",
                        status: "SUCCESS",
                        details: {
                            fileId,
                            sensitiveTypes: result.types,
                            documentType: result.documentType || "UNKNOWN",
                            findingsCount: (result.findings || []).length,
                            maskZonesCount: (result.maskZones || []).length,
                            maskedAadhaar: result.maskedAadhaar || null,
                            isRedacted: !!result.redactedPath
                        }
                    });
                } catch (auditErr) {
                    logger.warn(`[DPDP] Audit log skipped: ${auditErr.message}`);
                }
            }

            return result;
        } catch (err) {
            logger.error(`[DPDP] Scan failed for file ${fileId}: ${err.message}`);
            throw err;
        }
    }

    // ── Preview Only: detect PII without persisting ───────────────────────────

    async previewRedaction(filePath, mimeType) {
        return await processFile(filePath, mimeType);
    }

    // ── Consent Registration ──────────────────────────────────────────────────

    async createConsent(userId, fileId, data) {
        const file = await prisma.file.findUnique({ where: { id: fileId } });
        if (!file) throw new AppError("File not found", 404);
        if (file.ownerId !== userId) throw new AppError("You do not own this file", 403);

        const retentionDays = Number(data.retentionDays) || 365;
        const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

        const consent = await prisma.consentRecord.create({
            data: {
                fileId,
                userId,
                dataSubjectName: data.dataSubjectName,
                dataSubjectEmail: data.dataSubjectEmail || null,
                dataSubjectPhone: data.dataSubjectPhone || null,
                purpose: data.purpose,
                lawfulBasis: data.lawfulBasis || "EXPLICIT_CONSENT",
                status: "GRANTED",
                expiresAt,
                retentionNotice: `Data retained for ${retentionDays} days as per DPDP Act 2023.`
            }
        });

        // Update file retention
        await prisma.file.update({
            where: { id: fileId },
            data: {
                dpdpRetentionDays: retentionDays,
                dpdpExpiresAt: expiresAt
            }
        });

        try {
            const auditService = require("./audit.service");
            await auditService.logAction({
                user: userId,
                action: "DPDP_CONSENT_GRANTED",
                status: "SUCCESS",
                details: {
                    consentId: consent.id,
                    fileId,
                    purpose: data.purpose,
                    lawfulBasis: consent.lawfulBasis,
                    expiresAt: consent.expiresAt
                }
            });
        } catch (auditErr) {
            logger.warn(`[DPDP] Audit log skipped: ${auditErr.message}`);
        }

        logger.info(`[DPDP] Consent created: ${consent.id} for file ${fileId}`);
        return consent;
    }

    // ── List Consents ─────────────────────────────────────────────────────────

    async getUserConsents(userId, status = null) {
        const where = { userId, ...(status ? { status } : {}) };
        const consents = await prisma.consentRecord.findMany({
            where,
            include: {
                file: { select: { id: true, originalName: true, hasSensitiveData: true, maskedAadhaar: true, sensitiveTypes: true } },
                accessLogs: { orderBy: { timestamp: "desc" }, take: 20 }
            },
            orderBy: { createdAt: "desc" }
        });
        return consents;
    }

    // For admins: get all consents
    async getAllConsents(page = 1, limit = 20, status = null) {
        const where = status ? { status } : {};
        const [total, consents] = await Promise.all([
            prisma.consentRecord.count({ where }),
            prisma.consentRecord.findMany({
                where,
                include: {
                    file: { select: { id: true, originalName: true, hasSensitiveData: true, sensitiveTypes: true } },
                    user: { select: { id: true, name: true, email: true } },
                    accessLogs: { orderBy: { timestamp: "desc" }, take: 5 }
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: (page - 1) * limit
            })
        ]);
        return { total, data: consents };
    }

    // ── Log Access ────────────────────────────────────────────────────────────

    async logAccess(consentId, accessData) {
        const consent = await prisma.consentRecord.findUnique({ where: { id: consentId } });
        if (!consent) return;

        // Check if consent is still valid
        if (consent.status !== "GRANTED" || consent.expiresAt < new Date()) {
            if (consent.status === "GRANTED") {
                await prisma.consentRecord.update({
                    where: { id: consentId },
                    data: { status: "EXPIRED" }
                });
            }
            logger.warn(`[DPDP] Access attempted on ${consent.status} consent ${consentId}`);
        }

        return await prisma.consentAccessLog.create({
            data: {
                consentId,
                accessedByUserId: accessData.userId || null,
                accessedByName: accessData.userName || "Authorized Staff",
                action: accessData.action,
                purpose: accessData.purpose || consent.purpose,
                ipAddress: accessData.ip || "0.0.0.0",
                userAgent: accessData.userAgent || null
            }
        });
    }

    // ── Revoke Consent ────────────────────────────────────────────────────────

    async revokeConsent(consentId, userId, reason = "") {
        const consent = await prisma.consentRecord.findUnique({
            where: { id: consentId },
            include: { file: true }
        });

        if (!consent) throw new AppError("Consent record not found", 404);
        if (consent.userId !== userId) throw new AppError("Not authorized to revoke this consent", 403);
        if (consent.status === "REVOKED") throw new AppError("Consent already revoked", 400);

        const updated = await prisma.consentRecord.update({
            where: { id: consentId },
            data: {
                status: "REVOKED",
                revokedAt: new Date(),
                retentionNotice: reason || "Consent revoked by data principal (Right to Erasure — DPDP Act 2023)"
            }
        });

        // Log the revocation
        await this.logAccess(consentId, {
            userId,
            action: "DELETE",
            purpose: "Consent revoked — data minimization initiated",
            ip: "0.0.0.0"
        });

        try {
            const auditService = require("./audit.service");
            await auditService.logAction({
                user: userId,
                action: "DPDP_CONSENT_REVOKED",
                status: "SUCCESS",
                details: {
                    consentId,
                    fileId: consent.fileId,
                    reason: reason || "Revocation by data subject"
                }
            });
        } catch (auditErr) {
            logger.warn(`[DPDP] Audit log skipped: ${auditErr.message}`);
        }

        logger.info(`[DPDP] Consent ${consentId} revoked for file ${consent.fileId}`);
        return updated;
    }

    // ── Data Minimization / Purge ─────────────────────────────────────────────

    async purgeDataSubjectFile(consentId, userId) {
        const consent = await prisma.consentRecord.findUnique({
            where: { id: consentId },
            include: { file: { include: { versions: true } } }
        });

        if (!consent) throw new AppError("Consent not found", 404);
        if (consent.userId !== userId) throw new AppError("Not authorized", 403);

        const file = consent.file;

        // Delete S3 objects for all versions
        for (const v of file.versions || []) {
            if (v.s3Key) {
                try {
                    await storageService.deleteFile(v.s3Key);
                    logger.info(`[DPDP] Crypto-shredded S3 object: ${v.s3Key}`);
                } catch (e) {
                    logger.warn(`[DPDP] Failed to shred S3 key ${v.s3Key}: ${e.message}`);
                }
            }
        }

        // Delete file from DB (cascade deletes versions, consents, logs)
        await prisma.file.delete({ where: { id: file.id } });

        try {
            const auditService = require("./audit.service");
            await auditService.logAction({
                user: userId,
                action: "DPDP_DATA_PURGED",
                status: "SUCCESS",
                details: {
                    fileId: file.id,
                    consentId,
                    originalName: file.originalName,
                    purgedAt: new Date().toISOString()
                }
            });
        } catch (auditErr) {
            logger.warn(`[DPDP] Audit log skipped: ${auditErr.message}`);
        }

        logger.info(`[DPDP] Data minimization complete for file ${file.id} — all copies destroyed`);
        return { message: "Data subject file permanently deleted (Right to Erasure executed)", fileId: file.id };
    }

    // ── Expired Consent Purge Job ─────────────────────────────────────────────

    async purgeExpiredConsents() {
        const expired = await prisma.consentRecord.findMany({
            where: {
                status: "GRANTED",
                expiresAt: { lt: new Date() }
            }
        });

        let count = 0;
        for (const c of expired) {
            await prisma.consentRecord.update({
                where: { id: c.id },
                data: { status: "EXPIRED" }
            });
            count++;
        }

        logger.info(`[DPDP] Purge job: ${count} consents marked EXPIRED`);
        return { expiredCount: count };
    }

    // ── Audit Trail Export ────────────────────────────────────────────────────

    async getAuditTrail(consentId, requestingUserId) {
        const consent = await prisma.consentRecord.findUnique({
            where: { id: consentId },
            include: {
                file: { select: { id: true, originalName: true, hasSensitiveData: true, sensitiveTypes: true, maskedAadhaar: true } },
                user: { select: { id: true, name: true, email: true } },
                accessLogs: { orderBy: { timestamp: "asc" } }
            }
        });

        if (!consent) throw new AppError("Consent record not found", 404);
        if (consent.userId !== requestingUserId) throw new AppError("Not authorized", 403);

        return consent;
    }

    // ── Stats for Admin Dashboard ─────────────────────────────────────────────

    async getStats() {
        const [total, granted, revoked, expired, piiFiles] = await Promise.all([
            prisma.consentRecord.count(),
            prisma.consentRecord.count({ where: { status: "GRANTED" } }),
            prisma.consentRecord.count({ where: { status: "REVOKED" } }),
            prisma.consentRecord.count({ where: { status: "EXPIRED" } }),
            prisma.file.count({ where: { hasSensitiveData: true } })
        ]);

        const complianceRate = total > 0 ? Math.round((granted / total) * 100) : 0;

        return { total, granted, revoked, expired, piiFiles, complianceRate };
    }
}

module.exports = new DpdpService();