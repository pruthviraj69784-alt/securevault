const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      "FILE_SHARED",
      "SHARE_ACCEPTED",
      "SHARE_DECLINED",
      "SHARE_REVOKED",
      "ACCESS_REQUESTED",
      "ACCESS_APPROVED",
      "ACCESS_REJECTED",
      "FILE_DOWNLOADED",
      "UPLOAD_FINISHED",
      "UPLOAD_FAILED",
      "NEW_LOGIN",
      "FAILED_LOGIN",
      "PASSWORD_CHANGED",
      "ADMIN_MESSAGE",
      "LINK_EXPIRED"
    ],
    default: "FILE_SHARED"
  },
  priority: {
    type: String,
    enum: ["LOW", "NORMAL", "HIGH", "CRITICAL"],
    default: "NORMAL"
  },
  isRead: {
    type: Boolean,
    default: false
  },
  actionUrl: {
    type: String,
    default: ""
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
