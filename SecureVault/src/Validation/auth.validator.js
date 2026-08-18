const { body, validationResult } = require("express-validator");

const registerValidation = [

    body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 characters"),

    body("email")
    .isEmail()
    .withMessage("Invalid email"),

    body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

    (req, res, next) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const extractedErrors = errors.array()
            return res.status(400).json({
                success: false,
                message: extractedErrors[0].msg,
                errors: extractedErrors
            });
        }

        next();

    }

];

const loginValidation = [

    body("email")
    .isEmail()
    .withMessage("Invalid email"),

    body("password")
    .notEmpty()
    .withMessage("Password required"),

    (req, res, next) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const extractedErrors = errors.array()
            return res.status(400).json({
                success: false,
                message: extractedErrors[0].msg,
                errors: extractedErrors
            });
        }

        next();

    }

];

module.exports = {
    registerValidation,
    loginValidation
};