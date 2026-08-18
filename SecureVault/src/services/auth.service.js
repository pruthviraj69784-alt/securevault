const bcrypt = require("bcrypt");
const userRepository = require("../repositories/user.repository");
const fileRepository = require("../repositories/file.repository");
const { generateToken } = require("../utils/jwt");
const AppError = require("../Error/AppError");
const emailJob = require("../jobs/email.job");

class AuthService {

    async register(userData) {
        const existingUser = await userRepository.findByEmail(userData.email);

        if (existingUser) {
            throw new AppError("Email already exists", 409);
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        userData.password = hashedPassword;

        const user = await userRepository.createUser(userData);

        // Send welcome email in the background without blocking registration
        emailJob.send({
            to: user.email,
            subject: "Welcome to SecureVault",
            html: `
                <h2>Welcome to SecureVault!</h2>
                <p>Hi ${user.name}, your account has been created successfully.</p>
                <p>You can now securely upload, encrypt, and share your files.</p>
            `
        }).catch((err) => {
            console.error("[AUTH] Welcome email enqueue failed:", err.message || err);
        });

        return user;
    }

    async login(loginData, clientInfo = {}) {
        const user = await userRepository.findByEmail(loginData.email);

        if (!user) {
            throw new AppError("Invalid credentials", 401);
        }

        const isMatch = await bcrypt.compare(
            loginData.password,
            user.password
        );

        if (!isMatch) {
            throw new AppError("Invalid credentials", 401);
        }

        // Record device & login timestamp
        const browser = clientInfo.browser || "Chrome";
        const os = clientInfo.os || "Windows";
        const ip = clientInfo.ip || "127.0.0.1";

        const devices = Array.isArray(user.devices) ? [...user.devices] : [];
        const existingDevice = devices.find(d => d.browser === browser && d.os === os && d.ip === ip);
        if (existingDevice) {
            existingDevice.lastActive = new Date().toISOString();
        } else {
            devices.push({ browser, os, ip, lastActive: new Date().toISOString() });
        }

        const updatedUser = await userRepository.updateUser(user.id, {
            lastLoginAt: new Date(),
            devices
        });

        const token = generateToken(updatedUser);

        return {
            token,
            user: updatedUser
        };
    }

    async changePassword(userId, currentPassword, newPassword) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError("User not found", 404);

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) throw new AppError("Current password incorrect", 400);

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userRepository.updateUser(userId, { password: hashedPassword });
        return { message: "Password updated successfully" };
    }

    async updateNotificationPreferences(userId, prefs) {
        const user = await userRepository.updateUser(userId, { notificationPreferences: prefs });
        return user.notificationPreferences;
    }

    async deleteAccount(userId) {
        await userRepository.deleteUser(userId);
        return { message: "Account and associated data deleted permanently" };
    }

}

module.exports = new AuthService();