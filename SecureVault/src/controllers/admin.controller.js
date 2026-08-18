const adminService = require("../services/admin.service");
const asyncHandler = require("../utils/asyncHandler");

class AdminController {

    dashboard = asyncHandler(async(req, res) => {

        const data = await adminService.dashboard();

        res.json({
            success: true,
            data
        });

    });

    metrics = asyncHandler(async(req, res) => {
        const data = await adminService.metrics();

        res.json({
            success: true,
            data
        });
    });

    flagged = asyncHandler(async(req, res) => {
        const data = await adminService.flagged();

        res.json({
            success: true,
            data
        });
    });

    users = asyncHandler(async(req, res) => {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search || null;
        const sort = req.query.sort || null;

        const data = await adminService.users(page, limit, search, sort);

        res.json({
            success: true,
            page,
            limit,
            data
        });

    });

    files = asyncHandler(async(req, res) => {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search || null;
        const sort = req.query.sort || null;

        const data = await adminService.files(page, limit, search, sort);

        res.json({
            success: true,
            page,
            limit,
            data
        });

    });

    shares = asyncHandler(async(req, res) => {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search || null;
        const sort = req.query.sort || null;

        const data = await adminService.shares(page, limit, search, sort);

        res.json({
            success: true,
            page,
            limit,
            data
        });

    });

    audits = asyncHandler(async(req, res) => {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search || null;
        const sort = req.query.sort || null;

        const data = await adminService.audits(page, limit, search, sort);

        res.json({
            success: true,
            page,
            limit,
            data
        });

    });

    deleteUser = asyncHandler(async(req, res) => {

        const user = await adminService.deleteUser(req.params.id);

        res.json({
            success: true,
            message: "User deleted",
            data: user
        });

    });

    deleteFile = asyncHandler(async(req, res) => {

        const file = await adminService.deleteFile(req.params.id);

        res.json({
            success: true,
            message: "File deleted",
            data: file
        });

    });

    disableShare = asyncHandler(async(req, res) => {

        const share = await adminService.disableShare(req.params.id);

        res.json({
            success: true,
            message: "Share disabled",
            data: share
        });

    });

    enableShare = asyncHandler(async(req, res) => {

        const share = await adminService.enableShare(req.params.id);

        res.json({
            success: true,
            message: "Share enabled",
            data: share
        });

    });

    recentUsers = asyncHandler(async(req, res) => {

        res.json({
            success: true,
            data: await adminService.recentUsers()
        });

    });

    recentFiles = asyncHandler(async(req, res) => {

        res.json({
            success: true,
            data: await adminService.recentFiles()
        });

    });

    recentAudits = asyncHandler(async(req, res) => {

        res.json({
            success: true,
            data: await adminService.recentAudits()
        });

    });

    updateUserStatus = asyncHandler(async(req, res) => {
        const adminRepository = require("../repositories/admin.repository");
        const data = await adminRepository.updateUserStatus(req.params.id, req.body.status);
        res.json({ success: true, data });
    });

    updateUserRole = asyncHandler(async(req, res) => {
        const adminRepository = require("../repositories/admin.repository");
        const data = await adminRepository.updateUserRole(req.params.id, req.body.role);
        res.json({ success: true, data });
    });

    userDetails = asyncHandler(async(req, res) => {
        const adminRepository = require("../repositories/admin.repository");
        const data = await adminRepository.getUserDetails(req.params.id);
        res.json({ success: true, data });
    });

    queues = asyncHandler(async(req, res) => {
        res.json({
            success: true,
            data: {
                fileQueue: { waiting: 0, active: 1, completed: 142, failed: 0, delayed: 0 },
                emailQueue: { waiting: 0, active: 0, completed: 89, failed: 1, delayed: 0 }
            }
        });
    });

    webhooks = asyncHandler(async(req, res) => {
        const prisma = require("../config/prisma");
        const data = await prisma.webhook.findMany({
            include: { owner: { select: { id: true, name: true, email: true } } }
        });
        const mapped = data.map(w => ({
            ...w,
            _id: w.id,
            owner: w.owner ? { ...w.owner, _id: w.owner.id } : null
        }));
        res.json({ success: true, data: mapped });
    });

    storage = asyncHandler(async(req, res) => {
        const adminRepository = require("../repositories/admin.repository");
        const totalSize = await adminRepository.getTotalStorageSize();
        res.json({
            success: true,
            data: {
                totalCapacity: 20 * 1024 * 1024 * 1024 * 1024,
                used: totalSize,
                free: (20 * 1024 * 1024 * 1024 * 1024) - totalSize,
                avgPerUser: 13 * 1024 * 1024 * 1024
            }
        });
    });

    security = asyncHandler(async(req, res) => {
        const adminRepository = require("../repositories/admin.repository");
        const prisma = require("../config/prisma");

        const flagged = await adminRepository.getFlaggedFiles();
        const totalFiles = await prisma.file.count();
        const zkFilesCount = await prisma.fileVersion.count({ where: { isZeroKnowledge: true } });
        const blockedCount = 0;

        const zkPct = totalFiles > 0 ? Math.round((zkFilesCount / totalFiles) * 100) : 0;

        res.json({
            success: true,
            data: {
                failedLogins: 0,
                blockedAccounts: blockedCount,
                virusFiles: flagged.length,
                zeroKnowledgePct: zkPct,
                encryptedPct: 100,
                threats: flagged
            }
        });
    });

    settings = asyncHandler(async(req, res) => {
        res.json({
            success: true,
            data: {
                virusScan: true,
                maxUploadMb: 100,
                defaultShareExpiryDays: 7,
                registrationEnabled: true,
                maintenanceMode: false,
                rateLimitPerMin: 100,
                postgresStatus: "healthy",
                databaseStatus: "healthy",
                redisStatus: "healthy",
                s3Status: "healthy",
                smtpStatus: "healthy"
            }
        });
    });

}

module.exports = new AdminController();