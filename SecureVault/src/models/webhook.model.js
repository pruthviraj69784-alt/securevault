const mongoose = require("mongoose");

const webhookSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        url: {
            type: String,
            required: true,
            trim: true
        },

        events: {
            type: [String],
            default: ["FILE_SHARED"]
        },

        isActive: {
            type: Boolean,
            default: true
        },

        secret: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Webhook", webhookSchema);
