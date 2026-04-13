const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const shipmentSchema = new mongoose.Schema(
  {
    shipmentId: { type: String, unique: true },
   supplier: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Supplier",
  required: true,
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

const generateShipmentId = () =>
  `SHP-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

// Auto-generate shipmentId (safe for concurrent inserts/deletes)
shipmentSchema.pre("save", async function () {
  if (!this.shipmentId) {
    this.shipmentId = generateShipmentId();
  }
});

module.exports = mongoose.model("Shipment", shipmentSchema);
