const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const dlpController = require("../controllers/dlp.controller");

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/alerts", dlpController.getAlerts);
router.get("/metrics", dlpController.getMetrics);
router.post("/alerts/:id/mitigate", dlpController.mitigateAlert);
router.get("/compliance-report", dlpController.getComplianceReport);

module.exports = router;
