const fs = require("fs");
const qrSessionService = require("../services/qrSession.service");
const asyncHandler = require("../utils/asyncHandler");

class QRSessionController {
  create = asyncHandler(async (req, res) => {
    const fileId = req.params.fileId || req.body.fileId;
    const result = await qrSessionService.createQRSession(req.user._id, fileId, req.body);
    res.status(201).json({
      success: true,
      message: "QR share session created",
      data: result
    });
  });

  scan = asyncHandler(async (req, res) => {
    const { sessionId, nonce } = req.body;
    const result = await qrSessionService.scanQRSession(sessionId, nonce, req.ip, req.headers["user-agent"]);
    res.status(200).json({
      success: true,
      message: "QR session scanned and validated",
      data: result
    });
  });

  verify = asyncHandler(async (req, res) => {
    const { sessionId, nonce } = req.body;
    const result = await qrSessionService.verifyQRSession(sessionId, nonce, req.user._id, req.ip);
    res.status(200).json({
      success: true,
      message: "QR session authenticated",
      data: result
    });
  });

  consume = asyncHandler(async (req, res) => {
    const sessionId = req.body.sessionId || req.query.sessionId;
    const nonce = req.body.nonce || req.query.nonce;
    const userId = req.user ? req.user._id : null;

    const result = await qrSessionService.consumeQRSession(sessionId, nonce, userId, req.ip);

    const mimeType = result.mimeType || "application/octet-stream";
    const encodedName = encodeURIComponent(result.filename);

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"; filename*=UTF-8''${encodedName}`);

    if (result.isZeroKnowledge) {
      res.setHeader("X-Zero-Knowledge", "true");
      if (result.iv) res.setHeader("X-File-IV", result.iv);
    }

    const fileStream = fs.createReadStream(result.path);
    fileStream.pipe(res);

    fileStream.on("error", (err) => {
      fs.unlink(result.path, () => {});
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Error streaming file payload" });
      }
    });

    res.on("finish", () => {
      fs.unlink(result.path, () => {});
    });
  });

  revoke = asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId || req.body.sessionId;
    const result = await qrSessionService.revokeQRSession(sessionId, req.user._id, req.ip);
    res.status(200).json({
      success: true,
      data: result
    });
  });

  getAdminStats = asyncHandler(async (req, res) => {
    const stats = await qrSessionService.getAdminQRStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  });
}

module.exports = new QRSessionController();
