const { body, validationResult } = require("express-validator");

const createWebhookValidation = [
    body("url")
        .trim()
        .notEmpty()
        .withMessage("Webhook URL is required")
        .isURL({ require_tld: false, require_protocol: true })
        .withMessage("Invalid URL format"),

    body("events")
        .optional()
        .isArray()
        .withMessage("Events must be an array")
        .custom((events) => {
            const allowedEvents = ["FILE_SHARED"];
            const invalidEvents = events.filter(e => !allowedEvents.includes(e));
            if (invalidEvents.length > 0) {
                throw new Error(`Invalid events: ${invalidEvents.join(", ")}. Allowed: ${allowedEvents.join(", ")}`);
            }
            return true;
        }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

module.exports = {
    createWebhookValidation
};
