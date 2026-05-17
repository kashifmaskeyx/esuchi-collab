const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["Admin", "Manager", "Warehouse", "Sales", "Viewer"],
      default: "Viewer",
    },
    status: {
      type: String,
      enum: ["active", "invited", "suspended"],
      default: "invited",
    },
    permissions: {
      inventory: { type: Boolean, default: true },
      orders: { type: Boolean, default: false },
      shipments: { type: Boolean, default: false },
      staff: { type: Boolean, default: false },
    },
    lastActive: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

staffSchema.index({ owner: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("Staff", staffSchema);
