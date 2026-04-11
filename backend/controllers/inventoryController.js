const Inventory = require("../models/inventoryModel");

//
// CREATE inventory (usually when product is created)
//
exports.createInventory = async (req, res) => {
  try {
    const { product, currentStock, minimumStock } = req.body;

    const existing = await Inventory.findOne({ product });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Inventory already exists for this product" });
    }

    const inventory = await Inventory.create({
      product,
      currentStock,
      minimumStock,
    });

    res.status(201).json({ success: true, data: inventory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// GET all inventory
//
exports.getInventories = async (req, res) => {
  try {
    const inventories = await Inventory.find().populate(
      "product",
      "name price",
    );

    res.json({
      success: true,
      count: inventories.length,
      data: inventories,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// GET single inventory
//
exports.getInventoryById = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id).populate(
      "product",
      "name price",
    );

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    res.json({ success: true, data: inventory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// UPDATE stock
//
exports.updateStock = async (req, res) => {
  try {
    const { currentStock } = req.body;

    const inventory = await Inventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    inventory.currentStock = currentStock;
    inventory.lastUpdated = Date.now();

    await inventory.save();

    res.json({ success: true, data: inventory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// UPDATE minimum stock
//
exports.updateMinimumStock = async (req, res) => {
  try {
    const { minimumStock } = req.body;

    const inventory = await Inventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    inventory.minimumStock = minimumStock;
    inventory.lastUpdated = Date.now();

    await inventory.save();

    res.json({ success: true, data: inventory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//
// DELETE inventory
//
exports.deleteInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndDelete(req.params.id);

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    res.json({ success: true, message: "Inventory deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
