const prisma = require("../config/prisma");
const { GENESIS_HASH, computeRecordHash, computeRecordSignature } = require("../utils/auditIntegrity.util");

class AuditRepository {
    async create(data) {
        const userId = data.user ? String(data.user) : null;

        // Find the latest audit record with a valid recordHash for chain continuity
        const lastEntry = await prisma.audit.findFirst({
            where: {
                ...(userId ? { userId } : {}),
                recordHash: { not: null }
            },
            orderBy: { createdAt: "desc" },
            select: { recordHash: true }
        });

        const previousHash = lastEntry?.recordHash || GENESIS_HASH;
        const now = new Date();

        const recordHash = computeRecordHash({
            userId,
            action: data.action,
            status: data.status || "SUCCESS",
            ip: data.ip || "127.0.0.1",
            createdAt: now,
            previousHash,
            details: data.details || {}
        });

        const signature = computeRecordSignature(recordHash);

        const entry = await prisma.audit.create({
            data: {
                userId,
                action: data.action,
                status: data.status || "SUCCESS",
                ip: data.ip || "127.0.0.1",
                userAgent: data.userAgent || null,
                details: data.details || {},
                previousHash,
                recordHash,
                signature,
                createdAt: now
            },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        });

        return {
            ...entry,
            _id: entry.id,
            user: entry.user ? { ...entry.user, _id: entry.user.id } : null,
            ipAddress: entry.ip
        };
    }

    async getAll(userId, page = 1, limit = 20, action = null) {
        const where = {
            ...(userId ? { userId: String(userId) } : {}),
            ...(action && action !== "ALL" ? { action } : {})
        };
        const total = await prisma.audit.count({ where });

        const logs = await prisma.audit.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit
        });

        return {
            logs: logs.map((log) => ({
                ...log,
                _id: log.id,
                user: log.user ? { ...log.user, _id: log.user.id } : null,
                ipAddress: log.ip
            })),
            total
        };
    }

    async getChronologicalChain(userId) {
        const where = userId ? { userId: String(userId) } : {};
        return await prisma.audit.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: "asc" }
        });
    }

    async updateRecordIntegrity(id, { previousHash, recordHash, signature }) {
        return await prisma.audit.update({
            where: { id: String(id) },
            data: { previousHash, recordHash, signature }
        });
    }

    async clearByUser(userId) {
        const result = await prisma.audit.deleteMany({
            where: { userId: String(userId) }
        });
        return { deletedCount: result.count };
    }
}

module.exports = new AuditRepository();