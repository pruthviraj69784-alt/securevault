const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const audit = require("../middleware/audit.middleware");
const qrController = require("../controllers/qrSession.controller");

const isDev = process.env.NODE_ENV !== "production";

// Rate limit on QR scan & consume to prevent brute-force nonce guessing
const qrLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: isDev ? 500 : 30,
    message: { success: false, message: "Too many QR requests. Please slow down." },
    skip: () => isDev
});

// ── Generate QR session for a file (Must be logged-in owner) ──────────────────
router.post(
    "/create",
    authMiddleware,
    audit("QR_CREATED"),
    qrController.create
);

// ── Scan QR payload (Public / Mobile compatible) ─────────────────────────────
router.post(
    "/scan",
    qrLimiter,
    authMiddleware.optional,
    audit("QR_SCANNED"),
    qrController.scan
);

// ── Verify session ───────────────────────────────────────────────────────────
router.post(
    "/verify",
    qrLimiter,
    authMiddleware.optional,
    qrController.verify
);

// ── Consume & Stream File (Public peer download / Single-use) ────────────────
router.post(
    "/consume",
    qrLimiter,
    authMiddleware.optional,
    audit("QR_CONSUMED"),
    qrController.consume
);

router.get(
    "/consume",
    qrLimiter,
    authMiddleware.optional,
    audit("QR_CONSUMED"),
    qrController.consume
);

// ── Revoke a QR session (Owner only) ─────────────────────────────────────────
router.delete(
    "/:sessionId",
    authMiddleware,
    audit("QR_REVOKED"),
    qrController.revoke
);

// ── Admin stats ───────────────────────────────────────────────────────────────
router.get(
    "/admin/stats",
    authMiddleware,
    qrController.getAdminStats
);

module.exports = router;
