const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema(
  {
    shipmentId: { type: String, unique: true },
    supplier: {
      type: String,
      required: [true, "Supplier/Destination is required"],
      trim: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    expectedDeliveryDate: {
      type: Date,
      required: [true, "Expected delivery date is required"],
    },
    status: {
      type: String,
      enum: ["pending", "in_transit", "delivered", "cancelled"],
      default: "pending",
    },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Auto-generate shipmentId
shipmentSchema.pre("save", async function () {
  if (!this.shipmentId) {
    const count = await this.constructor.countDocuments();
    this.shipmentId = `SHP-${String(count + 1).padStart(4, "0")}`;
  }
});

module.exports = mongoose.model("Shipment", shipmentSchema);
