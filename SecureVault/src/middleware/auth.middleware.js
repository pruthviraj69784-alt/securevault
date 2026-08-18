const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/user.repository");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userRepository.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found."
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
};

const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await userRepository.findById(decoded.id);
            if (user) req.user = user;
        }
    } catch {}
    next();
};

authMiddleware.optional = optionalAuthMiddleware;
module.exports = authMiddleware;