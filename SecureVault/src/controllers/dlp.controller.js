const asyncHandler = require("../utils/asyncHandler");
const dlpService = require("../services/dlp.service");

class DlpController {

    // GET /api/dlp/alerts
    getAlerts = asyncHandler(async (req, res) => {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const filters = {
            severity: req.query.severity || null,
            status: req.query.status || null,
            channel: req.query.channel || null
        };
        const result = await dlpService.getAlerts(page, limit, filters);
        res.json({ success: true, ...result });
    });

    // GET /api/dlp/metrics
    getMetrics = asyncHandler(async (req, res) => {
        const metrics = await dlpService.getMetrics();
        res.json({ success: true, data: metrics });
    });

    // POST /api/dlp/alerts/:id/mitigate
    mitigateAlert = asyncHandler(async (req, res) => {
        const adminId = req.user.id || req.user._id;
        const { action, note } = req.body;
        const updated = await dlpService.mitigateAlert(req.params.id, action, note, adminId);
        res.json({ success: true, message: `Alert ${action}`, data: updated });
    });

    // GET /api/dlp/compliance-report
    getComplianceReport = asyncHandler(async (req, res) => {
        const report = await dlpService.getComplianceReport();
        res.json({ success: true, data: report });
    });
}

module.exports = new DlpController();
