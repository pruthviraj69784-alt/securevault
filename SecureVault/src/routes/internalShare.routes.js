const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const internalShareController = require("../controllers/internalShare.controller");

router.use(authMiddleware);

// Search registered users
router.get("/search-users", internalShareController.searchUsers);

// Create internal share
router.post("/", internalShareController.createShare);

// Shares received by the logged-in user
router.get("/received", internalShareController.receivedShares);

// Shares sent by the logged-in user
router.get("/sent", internalShareController.sentShares);

// Accept or Decline a pending share
router.patch("/:id/respond", internalShareController.respondShare);

// Revoke an active share
router.patch("/:id/revoke", internalShareController.revokeShare);

// Download file via internal share
router.get("/:id/download", internalShareController.downloadFile);

module.exports = router;
