const fs = require("fs");
const shareService = require("../services/share.service");
const asyncHandler = require("../utils/asyncHandler");

class ShareController {

    create = asyncHandler(async(req, res) => {

        const share = await shareService.createShare(
            req.user._id,
            req.body
        );

        res.status(201).json({
            success: true,
            message: "Share link created",
            data: {
                token: share.token,
                url: `http://localhost:5000/api/shares/${share.token}`
            }
        });

    });

    access = asyncHandler(async(req, res) => {

        const password = (req.body && req.body.password) || (req.query && req.query.password) || null;
        const otp = (req.body && req.body.otp) || null;

        const result = await shareService.accessShare(
            req.params.token,
            password,
            req.ip,
            otp
        );

        // Use manual stream instead of res.download() because res.download() internally uses
        // Express's send module which re-derives Content-Type from the temp file path extension.
        // Since the temp file has no extension (e.g. "1234-decrypted"), it always overrides
        // to application/octet-stream — breaking PDFs, images, etc. in the browser/OS.
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

    getInfo = asyncHandler(async(req, res) => {
        const info = await shareService.getShareInfo(req.params.token);
        res.status(200).json({
            success: true,
            data: info
        });
    });

    sendOtp = asyncHandler(async(req, res) => {
        const result = await shareService.sendOtp(req.params.token);
        res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            data: result
        });
    });

    getSharedWithMe = asyncHandler(async(req, res) => {
        const shares = await shareService.getSharedWithMe(req.user.id || req.user._id);
        res.status(200).json({
            success: true,
            data: shares
        });
    });

    getSharedByMe = asyncHandler(async(req, res) => {
        const shares = await shareService.getSharedByMe(req.user.id || req.user._id);
        res.status(200).json({
            success: true,
            data: shares
        });
    });

    revokeShare = asyncHandler(async(req, res) => {
        const result = await shareService.revokeShare(req.params.id, req.user.id || req.user._id);
        res.status(200).json({
            success: true,
            message: "Share revoked successfully",
            data: result
        });
    });

}

module.exports = new ShareController();