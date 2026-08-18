const prisma = require("../config/prisma");

class UserRepository {
    mapUser(user) {
        if (!user) return null;
        return {
            ...user,
            _id: user.id
        };
    }

    async createUser(userData) {
        const user = await prisma.user.create({
            data: {
                name: userData.name,
                email: userData.email,
                password: userData.password,
                role: userData.role || "USER",
                devices: userData.devices || [],
                notificationPreferences: userData.notificationPreferences || {}
            }
        });
        return this.mapUser(user);
    }

    async findByEmail(email) {
        const user = await prisma.user.findUnique({
            where: { email }
        });
        return this.mapUser(user);
    }

    async findById(id) {
        const user = await prisma.user.findUnique({
            where: { id: String(id) }
        });
        return this.mapUser(user);
    }

    async updateLastLogin(id) {
        const user = await prisma.user.update({
            where: { id: String(id) },
            data: { lastLoginAt: new Date() }
        });
        return this.mapUser(user);
    }

    async addDevice(id, device) {
        const user = await prisma.user.findUnique({ where: { id: String(id) } });
        if (!user) return null;

        const devices = Array.isArray(user.devices) ? user.devices : [];
        devices.push({ ...device, lastActive: new Date().toISOString() });

        const updated = await prisma.user.update({
            where: { id: String(id) },
            data: { devices }
        });
        return this.mapUser(updated);
    }

    async updateUser(id, data) {
        const user = await prisma.user.update({
            where: { id: String(id) },
            data
        });
        return this.mapUser(user);
    }

    async deleteUser(id) {
        await prisma.user.delete({
            where: { id: String(id) }
        });
        return true;
    }
}

module.exports = new UserRepository();