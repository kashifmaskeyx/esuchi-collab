const StockMovement = require("../models/stockMovementModel");
const Inventory = require("../models/inventoryModel");

//
// CREATE stock movement
//
exports.createMovement = async (req, res) => {
  try {
    const { product, movementType, quantity } = req.body;

    const inventory = await Inventory.findOne({ product });

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    // Update inventory based on movement type
    if (movementType === "IN") {
      inventory.currentStock += quantity;
    } else if (movementType === "OUT") {
      if (inventory.currentStock < quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      inventory.currentStock -= quantity;
    } else if (movementType === "ADJUSTMENT") {
      inventory.currentStock = quantity;
    }

    inventory.lastUpdated = Date.now();
    await inventory.save();

    // Save movement record
    const movement = await StockMovement.create({
      product,
      user: req.user._id, // from auth middleware
      movementType,
      quantity,
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