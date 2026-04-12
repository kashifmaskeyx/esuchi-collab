const mongoose = require("mongoose");

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

// Auto-generate inventoryId
inventorySchema.pre("save", async function () {
  if (!this.inventoryId) {
    const count = await this.constructor.countDocuments();
    this.inventoryId = `INV-${String(count + 1).padStart(4, "0")}`;
  }
});

module.exports = mongoose.model("Inventory", inventorySchema);
