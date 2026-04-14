const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const stockMovementSchema = new mongoose.Schema(
  {
    movementId: {
      type: String,
      unique: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    movementType: {
      type: String,
      enum: ["IN", "OUT", "ADJUSTMENT"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    movementDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const generateMovementId = () =>
  `MOV-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

// Auto-generate movementId (safe for concurrent inserts/deletes)
stockMovementSchema.pre("save", async function () {
  if (!this.movementId) {
    this.movementId = generateMovementId();
  }
});

module.exports = mongoose.model("StockMovement", stockMovementSchema);
