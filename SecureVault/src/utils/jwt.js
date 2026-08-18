const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    const userId = user.id || user._id;
    const secret = process.env.JWT_SECRET || "default_super_secret_jwt_key_securevault_2026";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    return jwt.sign(
        {
            id: userId,
            _id: userId,
            email: user.email,
            role: user.role
        },
        secret,
        {
            expiresIn
        }
    );
};

module.exports = {
    generateToken
};