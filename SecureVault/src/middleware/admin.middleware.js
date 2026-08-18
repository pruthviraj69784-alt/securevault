module.exports = (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    // Normalise to uppercase to prevent case-mismatch bypass (e.g. "admin", "Admin")
    const role = (req.user.role || "").toUpperCase();

    if (role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Admin access required"
        });
    }

    next();
};
