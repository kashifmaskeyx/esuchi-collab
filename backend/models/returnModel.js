const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const returnSchema = new mongoose.Schema(
  {
    returnId: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    condition: {
      type: String,
      enum: ["restockable", "damaged", "expired", "lost"],
      required: true,
    },
    resolution: {
      type: String,
      enum: ["restocked", "quarantined", "disposed", "refund", "replacement"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["completed", "review"],
      default: "completed",
    },
  },
  { timestamps: true },
);

const generateReturnId = () =>
  `RET-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

returnSchema.pre("save", async function () {
  if (!this.returnId) {
    this.returnId = generateReturnId();
  }
});

module.exports = mongoose.model("Return", returnSchema);
