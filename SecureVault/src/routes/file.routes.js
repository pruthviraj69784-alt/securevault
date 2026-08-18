const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const fileController = require("../controllers/file.controller");
const audit = require("../middleware/audit.middleware");

// ── Upload (creates new file or bumps version if same name exists) ────────────
router.post(
    "/upload",
    authMiddleware,
    audit("UPLOAD"),
    upload.single("file"),
    fileController.upload
);

// ── List all files owned by the authenticated user ────────────────────────────
router.get(
    "/my-files",
    authMiddleware,
    fileController.getMyFiles
);

// ── Favorites, Trash & Storage Stats ──────────────────────────────────────────
router.get("/favorites", authMiddleware, fileController.getFavorites);
router.get("/trash", authMiddleware, fileController.getTrash);
router.get("/storage-stats", authMiddleware, fileController.getStorageStats);

router.patch("/:id/favorite", authMiddleware, fileController.toggleFavorite);
router.put("/:id/trash", authMiddleware, fileController.moveToTrash);
router.put("/:id/restore-trash", authMiddleware, fileController.restoreFromTrash);

// ── Download a file — optional ?version=N query param ────────────────────────
router.get(
    "/download/:id",
    authMiddleware,
    audit("DOWNLOAD"),
    fileController.download
);

// ── List all versions of a specific file ──────────────────────────────────────
router.get(
    "/:id/versions",
    authMiddleware,
    fileController.getVersions
);

// ── Restore a previous version (creates a new version copy) ──────────────────
router.post(
    "/:id/restore",
    authMiddleware,
    audit("RESTORE_VERSION"),
    fileController.restore
);

// ── Delete a file and all its versions ───────────────────────────────────────
router.delete(
    "/:id",
    authMiddleware,
    audit("DELETE"),
    fileController.delete
);

module.exports = router;