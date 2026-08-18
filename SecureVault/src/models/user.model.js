const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["USER", "ADMIN"],
        default: "USER"
    },

    lastLoginAt: {
        type: Date,
        default: Date.now
    },

    devices: [
        {
            browser: String,
            os: String,
            ip: String,
            lastActive: { type: Date, default: Date.now }
        }
    ],

    notificationPreferences: {
        fileShared:      { type: Boolean, default: true },
        shareDownloaded: { type: Boolean, default: true },
        virusDetected:   { type: Boolean, default: true },
        loginAlert:      { type: Boolean, default: true },
        storageWarning:  { type: Boolean, default: true },
        webhookFailed:   { type: Boolean, default: true }
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);