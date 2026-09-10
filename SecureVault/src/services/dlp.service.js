/**
 * dlp.service.js
 * ─────────────────────────────────────────────────────────
 * Data Leak Prevention (DLP) & Anomaly Detection Engine
 * PS 5 — Real-time monitoring, risk scoring, alerting
 */

const prisma = require("../config/prisma");
const logger = require("../utils/logger");
const websocketService = require("./websocket.service");

// ── Risk Scoring Rules ────────────────────────────────────────────────────────

const DLP_RULES = {
    PII_PUBLIC_UNPROTECTED: {
        rule: "PII_PUBLIC_UNPROTECTED",
        description: "File containing PII shared publicly without password or OTP protection",
        baseScore: 75,
        severity: "HIGH"
    },
    PII_PUBLIC_UNENCRYPTED: {
        rule: "PII_PUBLIC_UNENCRYPTED",
        description: "Unencrypted file with sensitive identifiers exposed via public link",
        baseScore: 90,
        severity: "CRITICAL"
    },
    MASS_DOWNLOAD_ANOMALY: {
        rule: "MASS_DOWNLOAD_ANOMALY",
        description: "Abnormally high download frequency detected for a single user or file",
        baseScore: 65,
        severity: "HIGH"
    },
    OFF_HOURS_SENSITIVE_ACCESS: {
        rule: "OFF_HOURS_SENSITIVE_ACCESS",
        description: "Sensitive file accessed outside normal business hours (10PM–6AM)",
        baseScore: 45,
        severity: "MEDIUM"
    },
    ANONYMOUS_UNENCRYPTED_SHARE: {
        rule: "ANONYMOUS_UNENCRYPTED_SHARE",
        description: "File shared publicly without any access controls (no password, no OTP, no expiry)",
        baseScore: 80,
        severity: "CRITICAL"
    },
    BULK_EXPORT_ANOMALY: {
        rule: "BULK_EXPORT_ANOMALY",
        description: "Mass data export detected — possible exfiltration attempt",
        baseScore: 85,
        severity: "CRITICAL"
    },
    CROSS_CHANNEL_LEAK: {
        rule: "CROSS_CHANNEL_LEAK",
        description: "Same sensitive file transmitted across multiple channels simultaneously",
        baseScore: 70,
        severity: "HIGH"
    },
    QR_RAPID_SCAN: {
        rule: "QR_RAPID_SCAN",
        description: "QR code scanned from multiple IPs within a short time window",
        baseScore: 55,
        severity: "MEDIUM"
    }
};

// ── Helper: Get Hour in IST ───────────────────────────────────────────────────

function getISTHour() {
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    return ist.getHours();
}

// ── Helper: Create & Broadcast Alert ─────────────────────────────────────────

async function createAlert({ fileId, userId, channel, rule, riskScore, ipAddress, userAgent, metadata = {} }) {
    const ruleDef = DLP_RULES[rule];
    if (!ruleDef) return null;

    const severity = riskScore >= 85 ? "CRITICAL"
        : riskScore >= 65 ? "HIGH"
        : riskScore >= 40 ? "MEDIUM"
        : "LOW";

    try {
        const alert = await prisma.dlpAlert.create({
            data: {
                fileId: fileId || null,
                userId: userId || null,
                channel,
                severity,
                ruleTriggered: rule,
                description: ruleDef.description,
                riskScore,
                ipAddress: ipAddress || "0.0.0.0",
                userAgent: userAgent || null,
                metadata,
                status: "OPEN"
            }
        });

        // Broadcast via WebSocket to admins
        websocketService.broadcast("DLP_ALERT", {
            alertId: alert.id,
            rule,
            severity,
            riskScore,
            channel,
            description: ruleDef.description,
            fileId,
            userId,
            ipAddress,
            timestamp: alert.createdAt
        });

        try {
            const auditService = require("./audit.service");
            await auditService.logAction({
                user: userId || null,
                action: "DLP_ALERT_TRIGGERED",
                status: severity === "CRITICAL" ? "FAILED" : "WARNING",
                ip: ipAddress || "127.0.0.1",
                userAgent,
                details: {
                    alertId: alert.id,
                    rule,
                    severity,
                    riskScore,
                    channel,
                    fileId
                }
            });
        } catch (auditErr) {
            logger.warn(`[DLP] Audit log skipped: ${auditErr.message}`);
        }

        logger.warn(`[DLP] 🚨 Alert created: ${rule} | severity=${severity} | score=${riskScore} | file=${fileId}`);
        return alert;
    } catch (err) {
        logger.error(`[DLP] Failed to create alert: ${err.message}`);
        return null;
    }
}

// ── Evaluation Functions ──────────────────────────────────────────────────────

class DlpService {

    /**
     * Evaluate file share creation for DLP risks.
     * Called from share.service.js when a public share is created.
     */
    async evaluateShare({ file, share, userId, clientInfo = {} }) {
        if (!file) return;

        const alerts = [];
        const hasPII = file.hasSensitiveData;
        const hour = getISTHour();

        // Rule 1: PII shared publicly without protection
        if (hasPII && !share.isPasswordEnabled && !share.isOtpEnabled) {
            const score = DLP_RULES.PII_PUBLIC_UNPROTECTED.baseScore + (hasPII ? 10 : 0);
            alerts.push(await createAlert({
                fileId: file.id,
                userId,
                channel: "PUBLIC_LINK",
                rule: "PII_PUBLIC_UNPROTECTED",
                riskScore: Math.min(score, 100),
                ipAddress: clientInfo.ip,
                userAgent: clientInfo.userAgent,
                metadata: { shareId: share.id, sensitiveTypes: file.sensitiveTypes }
            }));
        }

        // Rule 2: Anonymous unprotected share (no password, no OTP, no IP restriction, no expiry)
        if (!share.isPasswordEnabled && !share.isOtpEnabled && !share.allowedIP) {
            alerts.push(await createAlert({
                fileId: file.id,
                userId,
                channel: "PUBLIC_LINK",
                rule: "ANONYMOUS_UNENCRYPTED_SHARE",
                riskScore: 80,
                ipAddress: clientInfo.ip,
                userAgent: clientInfo.userAgent,
                metadata: { shareId: share.id }
            }));
        }

        // Rule 3: Off-hours sensitive access
        if (hasPII && (hour >= 22 || hour < 6)) {
            alerts.push(await createAlert({
                fileId: file.id,
                userId,
                channel: "PUBLIC_LINK",
                rule: "OFF_HOURS_SENSITIVE_ACCESS",
                riskScore: 50,
                ipAddress: clientInfo.ip,
                userAgent: clientInfo.userAgent,
                metadata: { hour }
            }));
        }

        return alerts.filter(Boolean);
    }

    /**
     * Evaluate direct download events.
     * Called from file.service.js on file download.
     */
    async evaluateDownload({ file, userId, clientInfo = {} }) {
        if (!file) return;

        const alerts = [];
        const hour = getISTHour();

        // Rule: Off-hours access to sensitive file
        if (file.hasSensitiveData && (hour >= 22 || hour < 6)) {
            alerts.push(await createAlert({
                fileId: file.id,
                userId,
                channel: "DIRECT_DOWNLOAD",
                rule: "OFF_HOURS_SENSITIVE_ACCESS",
                riskScore: 45,
                ipAddress: clientInfo.ip,
                userAgent: clientInfo.userAgent,
                metadata: { hour, sensitiveTypes: file.sensitiveTypes }
            }));
        }

        // Rule: Mass download anomaly — check if user downloaded many files recently
        const recentDownloads = await prisma.dlpAlert.count({
            where: {
                userId,
                channel: "DIRECT_DOWNLOAD",
                createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // last 5 minutes
            }
        });

        if (recentDownloads >= 10) {
            alerts.push(await createAlert({
                fileId: file.id,
                userId,
                channel: "DIRECT_DOWNLOAD",
                rule: "MASS_DOWNLOAD_ANOMALY",
                riskScore: 65 + Math.min(recentDownloads - 10, 25),
                ipAddress: clientInfo.ip,
                userAgent: clientInfo.userAgent,
                metadata: { recentDownloads, windowMinutes: 5 }
            }));
        }

        return alerts.filter(Boolean);
    }

    /**
     * Evaluate QR scan events.
     */
    async evaluateQrScan({ file, shareId, clientInfo = {} }) {
        if (!file) return;

        // Check for rapid multi-IP QR scans
        const recentScans = await prisma.dlpAlert.count({
            where: {
                ruleTriggered: "QR_RAPID_SCAN",
                metadata: { path: ["shareId"], equals: shareId },
                createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
            }
        });

        if (recentScans >= 3) {
            return await createAlert({
                fileId: file.id,
                userId: null,
                channel: "QR_SCAN",
                rule: "QR_RAPID_SCAN",
                riskScore: 55,
                ipAddress: clientInfo.ip,
                userAgent: clientInfo.userAgent,
                metadata: { shareId, recentScans }
            });
        }
    }

    /**
     * Evaluate internal share creation.
     */
    async evaluateInternalShare({ file, recipientId, userId, clientInfo = {} }) {
        if (!file) return;
        const hour = getISTHour();

        if (file.hasSensitiveData && (hour >= 22 || hour < 6)) {
            return await createAlert({
                fileId: file.id,
                userId,
                channel: "INTERNAL_SHARE",
                rule: "OFF_HOURS_SENSITIVE_ACCESS",
                riskScore: 40,
                ipAddress: clientInfo.ip,
                userAgent: clientInfo.userAgent,
                metadata: { recipientId, hour }
            });
        }
    }

    // ── Alert Management ──────────────────────────────────────────────────────

    async getAlerts(page = 1, limit = 20, filters = {}) {
        const where = {};
        if (filters.severity) where.severity = filters.severity;
        if (filters.status) where.status = filters.status;
        if (filters.channel) where.channel = filters.channel;

        const [total, alerts] = await Promise.all([
            prisma.dlpAlert.count({ where }),
            prisma.dlpAlert.findMany({
                where,
                include: {
                    file: { select: { id: true, originalName: true, hasSensitiveData: true } },
                    user: { select: { id: true, name: true, email: true } }
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: (page - 1) * limit
            })
        ]);

        return { total, data: alerts };
    }

    async mitigateAlert(alertId, action, note, adminId) {
        const alert = await prisma.dlpAlert.findUnique({ where: { id: alertId } });
        if (!alert) return null;

        let newStatus = "RESOLVED";
        let mitigationNote = note || "";

        if (action === "BLOCK") {
            newStatus = "BLOCKED";
            mitigationNote = `Blocked by admin. ${note || ""}`;

            // Auto-revoke the share if tied to PUBLIC_LINK
            if (alert.fileId && alert.channel === "PUBLIC_LINK") {
                await prisma.share.updateMany({
                    where: { fileId: alert.fileId, isActive: true },
                    data: { isActive: false }
                });
                mitigationNote += " | All public shares for this file have been revoked.";
            }
        } else if (action === "INVESTIGATE") {
            newStatus = "INVESTIGATING";
        }

        const updated = await prisma.dlpAlert.update({
            where: { id: alertId },
            data: {
                status: newStatus,
                mitigationNote,
                resolvedAt: newStatus === "RESOLVED" || newStatus === "BLOCKED" ? new Date() : null,
                updatedAt: new Date()
            }
        });

        try {
            const auditService = require("./audit.service");
            await auditService.logAction({
                user: adminId || null,
                action: action === "BLOCK" ? "DLP_TRANSFER_BLOCKED" : "DLP_ALERT_MITIGATED",
                status: "SUCCESS",
                details: {
                    alertId,
                    action,
                    newStatus,
                    mitigationNote
                }
            });
        } catch (auditErr) {
            logger.warn(`[DLP] Audit log skipped: ${auditErr.message}`);
        }

        logger.info(`[DLP] Alert ${alertId} mitigated: action=${action} by admin=${adminId}`);
        return updated;
    }

    // ── Metrics for Dashboard ─────────────────────────────────────────────────

    async getMetrics() {
        const [
            totalAlerts,
            openAlerts,
            criticalAlerts,
            highAlerts,
            resolvedAlerts,
            byChannel,
            recentAlerts
        ] = await Promise.all([
            prisma.dlpAlert.count(),
            prisma.dlpAlert.count({ where: { status: "OPEN" } }),
            prisma.dlpAlert.count({ where: { severity: "CRITICAL" } }),
            prisma.dlpAlert.count({ where: { severity: "HIGH" } }),
            prisma.dlpAlert.count({ where: { status: { in: ["RESOLVED", "BLOCKED"] } } }),
            prisma.dlpAlert.groupBy({ by: ["channel"], _count: { id: true } }),
            prisma.dlpAlert.findMany({
                where: {},
                orderBy: { createdAt: "desc" },
                take: 10,
                include: {
                    file: { select: { id: true, originalName: true } },
                    user: { select: { id: true, name: true, email: true } }
                }
            })
        ]);

        // Calculate risk index (0-100)
        const riskIndex = totalAlerts > 0
            ? Math.min(Math.round(((criticalAlerts * 4 + highAlerts * 2 + openAlerts) / (totalAlerts * 4)) * 100), 100)
            : 0;

        const channelBreakdown = {};
        for (const row of byChannel) {
            channelBreakdown[row.channel] = row._count.id;
        }

        return {
            totalAlerts,
            openAlerts,
            criticalAlerts,
            highAlerts,
            resolvedAlerts,
            riskIndex,
            channelBreakdown,
            recentAlerts
        };
    }

    // ── Compliance Report ─────────────────────────────────────────────────────

    async getComplianceReport() {
        const [
            metrics,
            piiFiles,
            consentStats,
            topViolatingRules
        ] = await Promise.all([
            this.getMetrics(),
            prisma.file.count({ where: { hasSensitiveData: true } }),
            prisma.consentRecord.groupBy({ by: ["status"], _count: { id: true } }),
            prisma.dlpAlert.groupBy({
                by: ["ruleTriggered", "severity"],
                _count: { id: true },
                orderBy: { _count: { id: "desc" } },
                take: 10
            })
        ]);

        const consentBreakdown = {};
        for (const row of consentStats) {
            consentBreakdown[row.status] = row._count.id;
        }

        return {
            generatedAt: new Date().toISOString(),
            framework: "India Digital Personal Data Protection Act 2023",
            summary: {
                riskIndex: metrics.riskIndex,
                totalDlpAlerts: metrics.totalAlerts,
                openIncidents: metrics.openAlerts,
                criticalIncidents: metrics.criticalAlerts,
                piiExposedFiles: piiFiles,
                consentRecords: consentBreakdown,
                channelBreakdown: metrics.channelBreakdown
            },
            topViolations: topViolatingRules.map(r => ({
                rule: r.ruleTriggered,
                severity: r.severity,
                count: r._count.id
            })),
            recommendations: this._generateRecommendations(metrics, consentBreakdown)
        };
    }

    _generateRecommendations(metrics, consentBreakdown) {
        const recs = [];
        if (metrics.openAlerts > 5) recs.push("Immediate review of open DLP incidents is recommended.");
        if (metrics.riskIndex > 60) recs.push("Organization risk index is HIGH. Enforce mandatory password and OTP on all public shares.");
        if (metrics.channelBreakdown?.PUBLIC_LINK > 10) recs.push("Restrict public link creation for files containing PII.");
        if ((consentBreakdown?.EXPIRED || 0) > 5) recs.push("Run data minimization purge for expired consents.");
        if (recs.length === 0) recs.push("Organization is in good DPDP compliance standing.");
        return recs;
    }
}

module.exports = new DlpService();
