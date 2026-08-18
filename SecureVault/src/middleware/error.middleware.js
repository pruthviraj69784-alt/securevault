const logger = require("../utils/logger");
const multer = require("multer");

const errorMiddleware = (err, req, res, next) => {
    const statusCode = err instanceof multer.MulterError ? 400 : (err.statusCode || 500);
    const message = err.code === "LIMIT_FILE_SIZE"
        ? "File exceeds the configured upload size limit"
        : err.message;

    const isDev = process.env.NODE_ENV === "development";

    const requestId =
        req?.id ||
        req?.headers?.["x-request-id"] ||
        null;

    const logMeta = {
        requestId,
        method: req?.method,
        url: req?.originalUrl,
        ip: req?.ip,
        statusCode,
        stack: err.stack,
    };

    if (statusCode >= 500) {
        logger.error(message, logMeta);
    } else {
        logger.warn(message, logMeta);
    }

    res.status(statusCode).json({
        success: false,
        message: message || "Internal Server Error",
        ...(isDev && {
            stack: err.stack,
            requestId,
        }),
    });
};

module.exports = errorMiddleware;
