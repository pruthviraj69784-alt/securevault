const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");

class AuthController {

    // Register User
    register = asyncHandler(async (req, res) => {

        const user = await authService.register(req.body);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: user
        });

    });

    // Login User
    login = asyncHandler(async (req, res) => {
        const clientInfo = {
            ip: req.ip,
            userAgent: req.get("User-Agent") || ""
        };
        const result = await authService.login(req.body, clientInfo);

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: result
        });

    });

    // Get Logged-in User Profile
    profile = asyncHandler(async (req, res) => {

        res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            data: req.user
        });

    });

    // Change Password
    changePassword = asyncHandler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        const result = await authService.changePassword(req.user._id, currentPassword, newPassword);
        res.status(200).json({
            success: true,
            message: result.message
        });
    });

    // Update Notification Preferences
    updateNotificationPreferences = asyncHandler(async (req, res) => {
        const data = await authService.updateNotificationPreferences(req.user._id, req.body);
        res.status(200).json({
            success: true,
            data
        });
    });

    // Delete Account
    deleteAccount = asyncHandler(async (req, res) => {
        const result = await authService.deleteAccount(req.user._id);
        res.status(200).json({
            success: true,
            message: result.message
        });
    });

}

module.exports = new AuthController();