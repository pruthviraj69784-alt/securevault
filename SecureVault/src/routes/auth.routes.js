const express = require("express");

const router = express.Router();

const {
    registerValidation,
    loginValidation
} = require("../Validation/auth.validator");

const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const audit = require("../middleware/audit.middleware");
const { authLimiter } = require("../middleware/rateLimiter.middleware");

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register User
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       201:
 *         description: User Registered
 *       400:
 *         description: Validation Error
 *       409:
 *         description: Email already exists
 */
router.post("/register", audit("REGISTER"), ...registerValidation, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login User
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Login Successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", audit("LOGIN"), authLimiter, ...loginValidation, authController.login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get logged-in user profile
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", authMiddleware, authController.profile);
router.post("/change-password", authMiddleware, authController.changePassword);
router.put("/notification-preferences", authMiddleware, authController.updateNotificationPreferences);
router.delete("/account", authMiddleware, authController.deleteAccount);

module.exports = router;