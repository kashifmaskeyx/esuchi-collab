const StockMovement = require("../models/stockMovementModel");
const Inventory = require("../models/inventoryModel");
const Product = require("../models/productModel");

//
// CREATE stock movement
//
exports.createMovement = async (req, res) => {
  try {
    const { product, movementType, quantity, movementDate, confirmLowStock } =
      req.body;

    const inventory = await Inventory.findOne({ product });

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    const numericQuantity = Number(quantity);

    if (!Number.isFinite(numericQuantity) || numericQuantity < 1) {
      return res
        .status(400)
        .json({ message: "Quantity must be a number greater than 0" });
    }

    const productRecord = await Product.findById(product);

    if (!productRecord) {
      return res.status(404).json({ message: "Product not found" });
    }

    const parsedMovementDate = movementDate ? new Date(movementDate) : new Date();

    if (Number.isNaN(parsedMovementDate.getTime())) {
      return res.status(400).json({ message: "Invalid movement date" });
    }

    let updatedStock = inventory.currentStock;

    // Update inventory based on movement type
    if (movementType === "IN") {
      updatedStock += numericQuantity;
    } else if (movementType === "OUT") {
      if (inventory.currentStock < numericQuantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      updatedStock -= numericQuantity;

      if (updatedStock < inventory.minimumStock && !confirmLowStock) {
        return res.status(409).json({
          warning: true,
          message:
            "This stock out will reduce stock below the minimum level. Confirm to continue.",
          data: {
            product: productRecord.name,
            currentStock: inventory.currentStock,
            projectedStock: updatedStock,
            minimumStock: inventory.minimumStock,
          },
        });
      }
    } else if (movementType === "ADJUSTMENT") {
      updatedStock = numericQuantity;
    } else {
      return res.status(400).json({ message: "Invalid movement type" });
    }

    inventory.currentStock = updatedStock;
    inventory.lastUpdated = Date.now();
    await inventory.save();

    productRecord.quantity = updatedStock;
    await productRecord.save();

    // Save movement record
    const movement = await StockMovement.create({
      product,
      user: req.user._id, // from auth middleware
      movementType,
      quantity: numericQuantity,
      movementDate: parsedMovementDate,
    });

    res.status(201).json({
      success: true,
      data: movement,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// GET all movements
//
exports.getMovements = async (req, res) => {
  try {
    const movements = await StockMovement.find()
      .populate("product", "name")
      .populate("user", "name")
      .sort("-createdAt");

    res.json({
      success: true,
      count: movements.length,
      data: movements,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// GET movements by product
//
exports.getMovementsByProduct = async (req, res) => {
  try {
    const movements = await StockMovement.find({
      product: req.params.productId,
    }).sort("-createdAt");

    res.json({
      success: true,
      data: movements,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// DELETE movement (optional, usually restricted)
//
exports.deleteMovement = async (req, res) => {
  try {
    const movement = await StockMovement.findByIdAndDelete(req.params.id);

    if (!movement) {
      return res.status(404).json({ message: "Movement not found" });
    }

    res.json({ success: true, message: "Movement deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
