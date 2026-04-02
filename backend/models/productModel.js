const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
    },
    supplier: {
      type: String,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", productSchema);
