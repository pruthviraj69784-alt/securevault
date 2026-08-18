const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    action: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["SUCCESS", "FAILED"],
        required: true
    },
    ip: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Audit", auditSchema);
