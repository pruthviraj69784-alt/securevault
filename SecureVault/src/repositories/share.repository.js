const prisma = require("../config/prisma");

class ShareRepository {
    mapShare(share) {
        if (!share) return null;
        return {
            ...share,
            _id: share.id,
            file: share.file ? {
                ...share.file,
                _id: share.file.id,
                versions: (share.file.versions || []).map(v => ({ ...v, _id: v.id }))
            } : share.fileId,
            owner: share.ownerId
        };
    }

    async createShare(data) {
        const share = await prisma.share.create({
            data: {
                fileId: String(data.file),
                ownerId: String(data.owner),
                token: data.token,
                expiresAt: data.expiresAt instanceof Date ? data.expiresAt : new Date(data.expiresAt),
                password: data.password || null,
                maxDownloads: data.maxDownloads !== undefined && data.maxDownloads !== null && data.maxDownloads !== "" ? Number(data.maxDownloads) : 1,
                allowedIP: data.allowedIP || null,
                version: data.version ? Number(data.version) : null
            },
            include: { file: { include: { versions: { orderBy: { version: "asc" } } } } }
        });
        return this.mapShare(share);
    }

    async findByToken(token) {
        const share = await prisma.share.findUnique({
            where: { token },
            include: { file: { include: { versions: { orderBy: { version: "asc" } } } } }
        });
        return this.mapShare(share);
    }

    async findByOwner(ownerId) {
        const shares = await prisma.share.findMany({
            where: { ownerId: String(ownerId), isActive: true },
            include: { file: { include: { versions: { orderBy: { version: "asc" } } } } },
            orderBy: { createdAt: "desc" }
        });
        return shares.map(s => this.mapShare(s));
    }

    async updateShare(id, data) {
        const share = await prisma.share.update({
            where: { id: String(id) },
            data,
            include: { file: { include: { versions: { orderBy: { version: "asc" } } } } }
        });
        return this.mapShare(share);
    }

    async incrementDownload(id) {
        const share = await prisma.share.update({
            where: { id: String(id) },
            data: { downloadCount: { increment: 1 } },
            include: { file: { include: { versions: { orderBy: { version: "asc" } } } } }
        });
        return this.mapShare(share);
    }

    async deactivate(id) {
        const share = await prisma.share.update({
            where: { id: String(id) },
            data: { isActive: false },
            include: { file: { include: { versions: { orderBy: { version: "asc" } } } } }
        });
        return this.mapShare(share);
    }
}

module.exports = new ShareRepository();