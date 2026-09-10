const asyncHandler = require("../utils/asyncHandler");
const dpdpService = require("../services/dpdp.service");
const AppError = require("../Error/AppError");
const fs = require("fs");

class DpdpController {

    // POST /api/dpdp/preview — scan uploaded file for PII
    previewRedaction = asyncHandler(async (req, res) => {
        if (!req.file) throw new AppError("No file uploaded", 400);
        const result = await dpdpService.previewRedaction(req.file.path, req.file.mimetype);
        try { fs.unlinkSync(req.file.path); } catch {}
        res.json({ success: true, data: result });
    });

    // POST /api/dpdp/consents — create consent for a file
    createConsent = asyncHandler(async (req, res) => {
        const userId = req.user.id || req.user._id;
        const { fileId, dataSubjectName, dataSubjectEmail, dataSubjectPhone, purpose, lawfulBasis, retentionDays } = req.body;
        if (!fileId || !dataSubjectName || !purpose) throw new AppError("fileId, dataSubjectName, and purpose are required", 400);
        const consent = await dpdpService.createConsent(userId, fileId, { dataSubjectName, dataSubjectEmail, dataSubjectPhone, purpose, lawfulBasis, retentionDays });
        res.status(201).json({ success: true, message: "Consent registered", data: consent });
    });

    // GET /api/dpdp/consents — list user's consents
    getConsents = asyncHandler(async (req, res) => {
        const userId = req.user.id || req.user._id;
        const { status } = req.query;
        const consents = await dpdpService.getUserConsents(userId, status || null);
        res.json({ success: true, data: consents });
    });

    // POST /api/dpdp/consents/:id/revoke — revoke consent
    revokeConsent = asyncHandler(async (req, res) => {
        const userId = req.user.id || req.user._id;
        const { reason } = req.body;
        const updated = await dpdpService.revokeConsent(req.params.id, userId, reason);
        res.json({ success: true, message: "Consent revoked. Data minimization initiated.", data: updated });
    });

    // DELETE /api/dpdp/consents/:id/purge — right to erasure
    purgeData = asyncHandler(async (req, res) => {
        const userId = req.user.id || req.user._id;
        const result = await dpdpService.purgeDataSubjectFile(req.params.id, userId);
        res.json({ success: true, message: result.message, data: result });
    });

    // GET /api/dpdp/consents/:id/audit-trail — tamper-evident access log
    getAuditTrail = asyncHandler(async (req, res) => {
        const userId = req.user.id || req.user._id;
        const trail = await dpdpService.getAuditTrail(req.params.id, userId);
        res.json({ success: true, data: trail });
    });

    // POST /api/dpdp/consents/:id/access-log — log access event
    logAccess = asyncHandler(async (req, res) => {
        const userId = req.user.id || req.user._id;
        const { action, purpose } = req.body;
        const log = await dpdpService.logAccess(req.params.id, {
            userId, userName: req.user.name, action, purpose,
            ip: req.ip, userAgent: req.get("User-Agent")
        });
        res.json({ success: true, data: log });
    });

    // GET /api/dpdp/stats — admin stats
    getStats = asyncHandler(async (req, res) => {
        const stats = await dpdpService.getStats();
        res.json({ success: true, data: stats });
    });

    // GET /api/dpdp/all — admin: all consents
    getAllConsents = asyncHandler(async (req, res) => {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const { status } = req.query;
        const result = await dpdpService.getAllConsents(page, limit, status || null);
        res.json({ success: true, ...result });
    });
}

module.exports = new DpdpController();
