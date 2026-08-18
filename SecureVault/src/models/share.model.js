const mongoose = require("mongoose");

const shareSchema = new mongoose.Schema({

    file: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
        required: true
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    token: {
        type: String,
        required: true,
        unique: true
    },

    expiresAt: {
        type: Date,
        required: true
    },

    password: {
        type: String,
        default: null
    },

    maxDownloads: {
        type: Number,
        default: 1
    },

    downloadCount: {
        type: Number,
        default: 0
    },

    allowedIP: {
        type: String,
        default: null
    },

    isPasswordEnabled: {
        type: Boolean,
        default: false
    },

    isOtpEnabled: {
        type: Boolean,
        default: false
    },

    otpEmail: {
        type: String,
        default: null
    },

    isOneTimeAccess: {
        type: Boolean,
        default: false
    },

    isActive: {
        type: Boolean,
        default: true
    },

    // Pinned file version served by this share link (defaults to currentVersion at creation time)
    version: {
        type: Number,
        default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Share", shareSchema);
