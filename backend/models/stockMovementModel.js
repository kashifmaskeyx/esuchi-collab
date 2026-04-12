const mongoose = require("mongoose");

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

// Auto-generate movementId
stockMovementSchema.pre("save", async function () {
  if (!this.movementId) {
    const count = await this.constructor.countDocuments();
    this.movementId = `MOV-${String(count + 1).padStart(4, "0")}`;
  }
});

module.exports = mongoose.model("StockMovement", stockMovementSchema);