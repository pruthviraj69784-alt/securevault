const auditService = require("../services/audit.service");
const asyncHandler = require("../utils/asyncHandler");

class AuditController {

    getAll = asyncHandler(async(req, res) => {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const action = req.query.action || null;
        const data = await auditService.getLogs(req.user._id, page, limit, action);

        res.json({
            success: true,
            data: {
                ...data,
                page,
                limit
            }
        });
    });

    verify = asyncHandler(async(req, res) => {
        const result = await auditService.verifyIntegrity(req.user._id);
        res.json({
            success: true,
            message: result.isValid ? "Audit ledger integrity verified successfully." : "Tampering detected in audit ledger!",
            data: result
        });
    });

    clearAll = asyncHandler(async(req, res) => {
        const result = await auditService.clearLogs(req.user._id);
        res.json({
            success: true,
            message: `${result.deletedCount || 0} audit log(s) cleared successfully`
        });
    });

    repairLedger = asyncHandler(async(req, res) => {
        const result = await auditService.repairLedger(req.user._id);

        const messages = {
            REPAIRED:          `Ledger repaired! ${result.repaired} of ${result.total} blocks re-hashed.`,
            ALREADY_CLEAN:     `Ledger is already clean — all ${result.total} blocks verified.`,
            NOTHING_TO_REPAIR: `No audit records found to repair.`
        };

        res.json({
            success: true,
            message: messages[result.status] || "Ledger repair complete.",
            data: result
        });
    });

}

module.exports = new AuditController();