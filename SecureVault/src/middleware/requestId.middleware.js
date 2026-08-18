const crypto = require("crypto");
const logger = require("../utils/logger");

module.exports = (req, res, next) => {
    const requestId = req.headers["x-request-id"] || crypto.randomUUID();
    req.id = requestId;
    res.setHeader("X-Request-Id", requestId);
    req.logger = logger.child({ requestId });
    next();
};