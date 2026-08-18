const mongoose = require("mongoose");

const internalShareSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File",
    required: true
  },
  permission: {
    type: String,
    enum: ["VIEWER", "DOWNLOADER", "EDITOR", "MANAGER"],
    default: "DOWNLOADER"
  },
  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "DECLINED", "REVOKED"],
    default: "PENDING"
  },
  message: {
    type: String,
    default: ""
  },
  expiresAt: {
    type: Date,
    default: null
  },
  maxDownloads: {
    type: Number,
    default: null
  },
  downloadsCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

internalShareSchema.index({ owner: 1, recipient: 1, file: 1 });

module.exports = mongoose.model("InternalShare", internalShareSchema);
