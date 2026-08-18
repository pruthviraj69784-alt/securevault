const internalShareService = require("../services/internalShare.service");
const asyncHandler = require("../utils/asyncHandler");

class InternalShareController {
  searchUsers = asyncHandler(async (req, res) => {
    const query = req.query.q || "";
    const users = await internalShareService.searchUsers(query, req.user.id);
    res.json({ success: true, data: users });
  });

  createShare = asyncHandler(async (req, res) => {
    const share = await internalShareService.createInternalShare(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: "File shared successfully. Recipient will be notified.",
      data: share
    });
  });

  receivedShares = asyncHandler(async (req, res) => {
    const shares = await internalShareService.getReceivedShares(req.user.id);
    res.json({ success: true, data: shares });
  });

  sentShares = asyncHandler(async (req, res) => {
    const shares = await internalShareService.getSentShares(req.user.id);
    res.json({ success: true, data: shares });
  });

  respondShare = asyncHandler(async (req, res) => {
    const { action } = req.body; // "ACCEPT" or "DECLINE"
    if (!action || !["ACCEPT", "DECLINE"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'ACCEPT' or 'DECLINE'." });
    }
    const updated = await internalShareService.respondToShare(
      req.params.id,
      req.user.id,
      action
    );
    const verb = action === "ACCEPT" ? "accepted" : "declined";
    res.json({ success: true, message: `Share ${verb} successfully.`, data: updated });
  });

  revokeShare = asyncHandler(async (req, res) => {
    const updated = await internalShareService.revokeShare(req.params.id, req.user.id);
    res.json({ success: true, message: "Share revoked.", data: updated });
  });

  downloadFile = asyncHandler(async (req, res) => {
    const fs = require("fs");
    const result = await internalShareService.downloadSharedFile(req.params.id, req.user.id);

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
        res.status(500).json({ success: false, message: "Error streaming file" });
      }
    });

    res.on("finish", () => {
      fs.unlink(result.path, () => {});
    });
  });
}

module.exports = new InternalShareController();
