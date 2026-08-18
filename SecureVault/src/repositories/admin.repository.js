const prisma = require("../config/prisma");

class AdminRepository {
    mapUser(u) {
        if (!u) return null;
        const { password, ...rest } = u;
        return { ...rest, _id: u.id };
    }

    mapFile(f) {
        if (!f) return null;
        return {
            ...f,
            _id: f.id,
            owner: f.owner ? { ...f.owner, _id: f.owner.id } : f.ownerId,
            versions: (f.versions || []).map(v => ({ ...v, _id: v.id }))
        };
    }

    mapShare(s) {
        if (!s) return null;
        return {
            ...s,
            _id: s.id,
            owner: s.owner ? { ...s.owner, _id: s.owner.id } : s.ownerId,
            file: s.file ? { ...s.file, _id: s.file.id } : s.fileId
        };
    }

    mapAudit(a) {
        if (!a) return null;
        return {
            ...a,
            _id: a.id,
            user: a.user ? { ...a.user, _id: a.user.id } : a.userId,
            ipAddress: a.ip
        };
    }

    async getUserCount() {
        return await prisma.user.count();
    }

    async getFileCount() {
        return await prisma.file.count();
    }

    async getShareCount() {
        return await prisma.share.count();
    }

    async getAuditCount() {
        return await prisma.audit.count();
    }

    async getAllUsers(page, limit, search, sort) {
        const where = search ? {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } }
            ]
        } : {};

        const orderBy = sort ? { [sort]: "desc" } : { createdAt: "desc" };
        const take = limit ? Number(limit) : undefined;
        const skip = (page && limit) ? (Number(page) - 1) * Number(limit) : undefined;

        const users = await prisma.user.findMany({
            where,
            orderBy,
            take,
            skip
        });

        return users.map(u => this.mapUser(u));
    }

    async getAllFiles(page, limit, search, sort) {
        const where = search ? {
            originalName: { contains: search, mode: "insensitive" }
        } : {};

        const orderBy = sort ? { [sort]: "desc" } : { createdAt: "desc" };
        const take = limit ? Number(limit) : undefined;
        const skip = (page && limit) ? (Number(page) - 1) * Number(limit) : undefined;

        const files = await prisma.file.findMany({
            where,
            include: {
                owner: { select: { id: true, name: true, email: true } },
                versions: { orderBy: { version: "asc" } }
            },
            orderBy,
            take,
            skip
        });

        return files.map(f => this.mapFile(f));
    }

    async getAllShares(page, limit, search, sort) {
        const where = search ? {
            token: { contains: search, mode: "insensitive" }
        } : {};

        const orderBy = sort ? { [sort]: "desc" } : { createdAt: "desc" };
        const take = limit ? Number(limit) : undefined;
        const skip = (page && limit) ? (Number(page) - 1) * Number(limit) : undefined;

        const shares = await prisma.share.findMany({
            where,
            include: {
                owner: { select: { id: true, name: true, email: true } },
                file: { select: { id: true, originalName: true } }
            },
            orderBy,
            take,
            skip
        });

        return shares.map(s => this.mapShare(s));
    }

    async getAllAudits(page, limit, search, sort) {
        const where = search ? {
            action: { contains: search, mode: "insensitive" }
        } : {};

        const orderBy = sort ? { [sort]: "desc" } : { createdAt: "desc" };
        const take = limit ? Number(limit) : undefined;
        const skip = (page && limit) ? (Number(page) - 1) * Number(limit) : undefined;

        const audits = await prisma.audit.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } }
            },
            orderBy,
            take,
            skip
        });

        return audits.map(a => this.mapAudit(a));
    }

    async deleteUser(userId) {
        await prisma.user.delete({ where: { id: String(userId) } });
        return true;
    }

    async deleteFile(fileId) {
        await prisma.file.delete({ where: { id: String(fileId) } });
        return true;
    }

    async disableShare(shareId) {
        const share = await prisma.share.update({
            where: { id: String(shareId) },
            data: { isActive: false }
        });
        return this.mapShare(share);
    }

    async enableShare(shareId) {
        const share = await prisma.share.update({
            where: { id: String(shareId) },
            data: { isActive: true }
        });
        return this.mapShare(share);
    }

    async getTotalStorageSize() {
        const aggregate = await prisma.fileVersion.aggregate({
            _sum: { size: true }
        });
        return aggregate._sum.size || 0;
    }

    async getStatusBreakdown() {
        const result = await prisma.fileVersion.groupBy({
            by: ['status'],
            _count: { status: true }
        });
        return result.reduce((acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
        }, {});
    }

    async getUploadsByDay() {
        const files = await prisma.file.findMany({
            select: { createdAt: true }
        });

        const dayMap = {};
        files.forEach(f => {
            const dateStr = new Date(f.createdAt).toISOString().split('T')[0];
            dayMap[dateStr] = (dayMap[dateStr] || 0) + 1;
        });

        return Object.keys(dayMap).sort().map(date => ({ date, count: dayMap[date] }));
    }

    async getFlaggedFiles() {
        const files = await prisma.file.findMany({
            where: {
                versions: { some: { status: "FAILED" } }
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                versions: { orderBy: { version: "asc" } }
            },
            orderBy: { updatedAt: "desc" }
        });
        return files.map(f => this.mapFile(f));
    }

    async getRecentUsers() {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 10
        });
        return users.map(u => this.mapUser(u));
    }

    async getRecentFiles() {
        const files = await prisma.file.findMany({
            include: {
                owner: { select: { id: true, name: true, email: true } },
                versions: { orderBy: { version: "asc" } }
            },
            orderBy: { createdAt: "desc" },
            take: 10
        });
        return files.map(f => this.mapFile(f));
    }

    async getRecentAudits() {
        const audits = await prisma.audit.findMany({
            include: {
                user: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 20
        });
        return audits.map(a => this.mapAudit(a));
    }

    async updateUserRole(userId, role) {
        const user = await prisma.user.update({
            where: { id: String(userId) },
            data: { role: role.toUpperCase() }
        });
        return this.mapUser(user);
    }

    async getUserDetails(userId) {
        const user = await prisma.user.findUnique({
            where: { id: String(userId) }
        });
        if (!user) return null;

        const files = await prisma.file.findMany({ where: { ownerId: String(userId) } });
        const shares = await prisma.share.findMany({ where: { ownerId: String(userId) } });
        const audits = await prisma.audit.findMany({ where: { userId: String(userId) }, orderBy: { createdAt: "desc" }, take: 20 });

        return {
            user: this.mapUser(user),
            files: files.map(f => this.mapFile(f)),
            shares: shares.map(s => this.mapShare(s)),
            audits: audits.map(a => this.mapAudit(a))
        };
    }
}

module.exports = new AdminRepository();