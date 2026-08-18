const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const shareController = require("../controllers/share.controller");
const audit = require("../middleware/audit.middleware");

const qrController = require("../controllers/qrSession.controller");

// ── Authenticated User Share Lists ──────────────────────────────────────────
router.get(
    "/with-me",
    authMiddleware,
    shareController.getSharedWithMe
);

router.get(
    "/by-me",
    authMiddleware,
    shareController.getSharedByMe
);

router.delete(
    "/:id",
    authMiddleware,
    shareController.revokeShare
);

router.patch(
    "/:id/revoke",
    authMiddleware,
    shareController.revokeShare
);

// ── Create Shares ───────────────────────────────────────────────────────────
// Create QR share session: POST /api/shares/:fileId/qr
router.post(
    "/:fileId/qr",
    authMiddleware,
    audit("QR_CREATED"),
    qrController.create
);

router.post(
    "/",
    authMiddleware,
    audit("CREATE_SHARE"),
    shareController.create
);

// ── Public Access / Token Endpoints ─────────────────────────────────────────
// Metadata info for public share portal
router.get(
    "/:token/info",
    shareController.getInfo
);

// Send OTP code for verification
router.post(
    "/:token/send-otp",
    shareController.sendOtp
);

// Access and download files using password/OTP
router.post(
    "/:token/access",
    audit("ACCESS_SHARE"),
    shareController.access
);

// No auth — anyone with the link can access
router.post(
    "/:token",
    audit("ACCESS_SHARE"),
    shareController.access
);

// Support direct download links via GET so shared URLs can be opened directly.
router.get(
    "/:token",
    audit("ACCESS_SHARE"),
    shareController.access
);

module.exports = router;