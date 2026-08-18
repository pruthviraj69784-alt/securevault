const rateLimit = require("express-rate-limit");

const isDev = process.env.NODE_ENV !== "production";

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 1000 : 10,
    message: {
        success: false,
        message: "Too many login attempts. Try again after 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isDev // Skip rate limiting completely in local development
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 5000 : 500,
    message: {
        success: false,
        message: "Too many requests."
    },
    skip: () => isDev // Skip rate limiting completely in local development
});

module.exports = {
    authLimiter,
    apiLimiter
};