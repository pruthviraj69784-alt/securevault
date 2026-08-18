const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

const adminController = require("../controllers/admin.controller");

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/dashboard", adminController.dashboard);
router.get("/metrics", adminController.metrics);
router.get("/flagged", adminController.flagged);
router.get("/users", adminController.users);
router.get("/files", adminController.files);
router.get("/shares", adminController.shares);
router.get("/audits", adminController.audits);

router.delete(
    "/users/:id",
    adminController.deleteUser
);

router.delete(
    "/files/:id",
    adminController.deleteFile
);

router.patch(
    "/shares/:id/disable",
    adminController.disableShare
);

router.patch(
    "/shares/:id/enable",
    adminController.enableShare
);

router.get(
    "/recent/users",
    adminController.recentUsers
);

router.get(
    "/recent/files",
    adminController.recentFiles
);

router.get("/recent/audits", adminController.recentAudits);

router.get("/users/:id/details", adminController.userDetails);
router.put("/users/:id/status", adminController.updateUserStatus);
router.put("/users/:id/role", adminController.updateUserRole);

router.get("/queues", adminController.queues);
router.get("/webhooks", adminController.webhooks);
router.get("/storage", adminController.storage);
router.get("/security", adminController.security);
router.get("/settings", adminController.settings);

module.exports = router;