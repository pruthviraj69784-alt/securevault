const auditService = require("../services/audit.service");

module.exports = (action) => {

    return async (req, res, next) => {

        // Skip audit logging during tests
        if (process.env.NODE_ENV === "test") {
            return next();
        }

        // res.on("finish") fires after the response is sent — non-blocking
        res.on("finish", () => {

            // Resolve the real client IP, accounting for reverse proxies
            const ip =
                req.headers["x-forwarded-for"]?.split(",")[0].trim()
                || req.ip;

            auditService.log({

                user: req.user ? req.user._id : null,

                action,

                // Optional resource info set by controllers via req.auditResource
                resourceId: req.auditResource?.id ?? null,
                resourceType: req.auditResource?.type ?? null,

                status: res.statusCode < 400 ? "SUCCESS" : "FAILED",

                ip,

                userAgent: req.headers["user-agent"]

            }).catch((err) => {
                // Swallow audit errors — must never break the request lifecycle
                console.error("[AUDIT ERROR]", err.message);
            });

        });

        next();

    };

};