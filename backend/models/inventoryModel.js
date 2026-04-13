const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const inventorySchema = new mongoose.Schema(
  {
    inventoryId: {
      type: String,
      unique: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true, // one inventory per product
    },

    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    minimumStock: {
      type: Number,
      required: true,
      default: 5,
      min: 0,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

const generateInventoryId = () =>
  `INV-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

// Auto-generate inventoryId (safe for concurrent inserts/deletes)
inventorySchema.pre("save", async function () {
  if (!this.inventoryId) {
    this.inventoryId = generateInventoryId();
  }
});

module.exports = mongoose.model("Inventory", inventorySchema);
