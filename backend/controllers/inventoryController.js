const Inventory = require("../models/inventoryModel");
const Product = require("../models/productModel");

//
// CREATE inventory (usually when product is created)
//
exports.createInventory = async (req, res) => {
  try {
    const { product, currentStock, minimumStock } = req.body;

    const productRecord = await Product.findOne({
      _id: product,
      user: req.user._id,
    });

    if (!productRecord) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existing = await Inventory.findOne({ product, user: req.user._id });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Inventory already exists for this product" });
    }

    const inventory = await Inventory.create({
      product,
      user: req.user._id,
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
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalInventories = await Inventory.countDocuments();

    const inventories = await Inventory.find()
      .populate("product", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: inventories.length,
      totalInventories,
      totalPages: Math.ceil(totalInventories / limit),
      currentPage: page,
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
    const inventory = await Inventory.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("product", "name price");

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

    const query =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, user: req.user._id };

    const inventory = await Inventory.findOne(query);

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

    const query =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, user: req.user._id };

    const inventory = await Inventory.findOne(query);

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
    const query =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, user: req.user._id };

    const inventory = await Inventory.findOneAndDelete(query);

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    res.json({ success: true, message: "Inventory deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
