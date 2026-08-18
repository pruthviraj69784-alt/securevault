const adminRepository = require("../repositories/admin.repository");

class AdminService {

    async dashboard() {

        const users = await adminRepository.getUserCount();
        const files = await adminRepository.getFileCount();
        const shares = await adminRepository.getShareCount();
        const audits = await adminRepository.getAuditCount();

        return {
            users,
            files,
            shares,
            audits
        };
    }

    async metrics() {
        const prisma = require("../config/prisma");

        const [totalUsers, totalFiles, totalSize, statusBreakdown, uploadsByDay, flaggedFiles, totalWebhooks, totalShares, zkFilesCount] = await Promise.all([
            adminRepository.getUserCount(),
            adminRepository.getFileCount(),
            adminRepository.getTotalStorageSize(),
            adminRepository.getStatusBreakdown(),
            adminRepository.getUploadsByDay(),
            adminRepository.getFlaggedFiles(),
            prisma.webhook.count(),
            prisma.share.count(),
            prisma.fileVersion.count({ where: { isZeroKnowledge: true } })
        ]);

        const readyFiles = statusBreakdown.READY || 0;
        const processingFiles = statusBreakdown.PROCESSING || 0;
        const infectedFiles = flaggedFiles.length;
        const zkPct = totalFiles > 0 ? Math.round((zkFilesCount / totalFiles) * 100) : 0;

        return {
            totalUsers,
            totalFiles,
            totalSize,
            totalShares,
            totalWebhooks,
            readyFiles,
            processingFiles,
            infectedFiles,
            flaggedFiles: infectedFiles,
            zeroKnowledgePct: zkPct,
            uploadsByDay,
            statusBreakdown: {
                READY: readyFiles,
                PROCESSING: processingFiles,
                FAILED: infectedFiles
            }
        };
    }

    async flagged() {
        return await adminRepository.getFlaggedFiles();
    }

    async users(page, limit, search, sort) {
        return await adminRepository.getAllUsers(page, limit, search, sort);
    }

    async files(page, limit, search, sort) {
        return await adminRepository.getAllFiles(page, limit, search, sort);
    }

    async shares(page, limit, search, sort) {
        return await adminRepository.getAllShares(page, limit, search, sort);
    }

    async audits(page, limit, search, sort) {
        return await adminRepository.getAllAudits(page, limit, search, sort);
    }

    async deleteUser(id) {
        return await adminRepository.deleteUser(id);
    }

    async deleteFile(id) {
        const fileRepository = require("../repositories/file.repository");
        const storageService = require("./storage.service");

        const file = await fileRepository.getFileById(id);

        if (file && file.versions && file.versions.length > 0) {
            // Delete every version's S3 object
            for (const v of file.versions) {
                if (v.s3Key) {
                    try {
                        await storageService.deleteFile(v.s3Key);
                    } catch (err) {
                        console.error(
                            `[ADMIN] Failed to delete S3 key ${v.s3Key} (v${v.version}):`,
                            err.message
                        );
                    }
                }
            }
        }

        return await adminRepository.deleteFile(id);
    }

    async disableShare(id) {
        return await adminRepository.disableShare(id);
    }

    async enableShare(id) {
        return await adminRepository.enableShare(id);
    }

    async recentUsers() {
        return await adminRepository.getRecentUsers();
    }

    async recentFiles() {
        return await adminRepository.getRecentFiles();
    }

    async recentAudits() {
        return await adminRepository.getRecentAudits();
    }

}

module.exports = new AdminService();