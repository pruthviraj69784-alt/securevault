const mongoose = require("mongoose");

const accessRequestSchema = new mongoose.Schema({
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File",
    required: true
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  note: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING"
  }
}, { timestamps: true });

accessRequestSchema.index({ file: 1, requester: 1 });

module.exports = mongoose.model("AccessRequest", accessRequestSchema);
