const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const dpdpController = require("../controllers/dpdp.controller");

const upload = multer({ dest: path.join(__dirname, "../../uploads/dpdp-preview/") });

// All routes require auth
router.use(authMiddleware);

// Preview PII detection (upload any file, scan & return findings)
router.post("/preview", upload.single("file"), dpdpController.previewRedaction);

// Consent management (user-facing)
router.post("/consents", dpdpController.createConsent);
router.get("/consents", dpdpController.getConsents);
router.post("/consents/:id/revoke", dpdpController.revokeConsent);
router.delete("/consents/:id/purge", dpdpController.purgeData);
router.get("/consents/:id/audit-trail", dpdpController.getAuditTrail);
router.post("/consents/:id/access-log", dpdpController.logAccess);

// Admin-only endpoints
router.get("/stats", adminMiddleware, dpdpController.getStats);
router.get("/all", adminMiddleware, dpdpController.getAllConsents);

module.exports = router;
