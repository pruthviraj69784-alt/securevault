const mongoose = require("mongoose");

// Sub-document schema for a single file version
const versionSchema = new mongoose.Schema(
    {
        version: {
            type: Number,
            required: true
        },

        storedName: {
            type: String,
            required: true
        },

        s3Key: {
            type: String,
            required: true
        },

        size: {
            type: Number,
            required: true
        },

        mimeType: {
            type: String,
            required: true
        },

        iv: {
            type: String,
            default: null
        },

        hash: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ["PROCESSING", "READY", "FAILED"],
            default: "PROCESSING"
        },

        isZeroKnowledge: {
            type: Boolean,
            default: false
        }

    },
    {
        timestamps: true,
        _id: false
    }
);

const fileSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        originalName: {
            type: String,
            required: true
        },

        extension: {
            type: String,
            required: true
        },

        // Pointer to the active version number (latest by default)
        currentVersion: {
            type: Number,
            default: 1
        },

        isFavorite: {
            type: Boolean,
            default: false
        },

        isTrashed: {
            type: Boolean,
            default: false
        },

        trashedAt: {
            type: Date,
            default: null
        },

        category: {
            type: String,
            enum: ["documents", "images", "videos", "others"],
            default: "others"
        },

        versions: [versionSchema]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("File", fileSchema);