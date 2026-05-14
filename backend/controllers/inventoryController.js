const mongoose = require("mongoose");
const Inventory = require("../models/inventoryModel");
const Product = require("../models/productModel");

const withTransaction = async (handler) => {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await handler(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

//
// CREATE inventory (usually when product is created)
//
exports.createInventory = async (req, res) => {
  try {
    const { product, currentStock, minimumStock } = req.body;
    const numericStock = Number(currentStock);
    const numericMinimumStock = Number(minimumStock);

    if (!Number.isFinite(numericStock) || numericStock < 0) {
      return res
        .status(400)
        .json({ message: "Current stock must be 0 or greater" });
    }

    if (!Number.isFinite(numericMinimumStock) || numericMinimumStock < 0) {
      return res
        .status(400)
        .json({ message: "Minimum stock must be 0 or greater" });
    }

    const inventory = await withTransaction(async (session) => {
      const productRecord = await Product.findOne({
        _id: product,
        user: req.user._id,
      }).session(session);

      if (!productRecord) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
      }

      const existing = await Inventory.findOne({
        product,
        user: req.user._id,
      }).session(session);

      if (existing) {
        const error = new Error("Inventory already exists for this product");
        error.statusCode = 400;
        throw error;
      }

      const [createdInventory] = await Inventory.create(
        [
          {
            product,
            user: req.user._id,
            currentStock: numericStock,
            minimumStock: numericMinimumStock,
          },
        ],
        { session },
      );

      productRecord.quantity = numericStock;
      await productRecord.save({ session });

      return createdInventory;
    });

    res.status(201).json({ success: true, data: inventory });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      message: err.statusCode ? err.message : "Unable to create inventory",
    });
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

    const query = { user: req.user._id };
    const shouldPaginate = req.query.page !== undefined;

    const totalInventories = await Inventory.countDocuments(query);

    let inventoriesQuery = Inventory.find(query)
      .populate("product", "name price")
      .sort({ createdAt: -1 });

    if (shouldPaginate) {
      inventoriesQuery = inventoriesQuery.skip(skip).limit(limit);
    }

    const inventories = await inventoriesQuery;

    res.json({
      success: true,
      count: inventories.length,
      totalInventories,
      totalPages: Math.ceil(totalInventories / limit),
      currentPage: page,
      data: inventories,
    });
  } catch (err) {
    res.status(500).json({ message: "Unable to load inventory" });
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
    res.status(500).json({ message: "Unable to load inventory" });
  }
};

//
// UPDATE stock
//
exports.updateStock = async (req, res) => {
  try {
    const { currentStock } = req.body;
    const numericStock = Number(currentStock);

    if (!Number.isFinite(numericStock) || numericStock < 0) {
      return res
        .status(400)
        .json({ message: "Current stock must be 0 or greater" });
    }

    const inventory = await withTransaction(async (session) => {
      const updatedInventory = await Inventory.findOneAndUpdate(
        {
          _id: req.params.id,
          user: req.user._id,
        },
        {
          currentStock: numericStock,
          lastUpdated: Date.now(),
        },
        { new: true, runValidators: true, session },
      );

      if (!updatedInventory) {
        const error = new Error("Inventory not found");
        error.statusCode = 404;
        throw error;
      }

      await Product.findOneAndUpdate(
        { _id: updatedInventory.product, user: req.user._id },
        { quantity: numericStock },
        { runValidators: true, session },
      );

      return updatedInventory;
    });

    res.json({ success: true, data: inventory });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      message: err.statusCode ? err.message : "Unable to update stock",
    });
  }
};

//
// UPDATE minimum stock
//
exports.updateMinimumStock = async (req, res) => {
  try {
    const { minimumStock } = req.body;
    const numericMinimumStock = Number(minimumStock);

    if (!Number.isFinite(numericMinimumStock) || numericMinimumStock < 0) {
      return res
        .status(400)
        .json({ message: "Minimum stock must be 0 or greater" });
    }

    const inventory = await Inventory.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    inventory.minimumStock = numericMinimumStock;
    inventory.lastUpdated = Date.now();

    await inventory.save();

    res.json({ success: true, data: inventory });
  } catch (err) {
    res.status(500).json({ message: "Unable to update minimum stock" });
  }
};

//
// DELETE inventory
//
exports.deleteInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    const product = await Product.exists({
      _id: inventory.product,
      user: req.user._id,
    });

    if (product) {
      return res.status(409).json({
        message:
          "Inventory is linked to a product. Delete the product to remove both records.",
      });
    }

    await Inventory.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    res.json({ success: true, message: "Inventory deleted" });
  } catch (err) {
    res.status(500).json({ message: "Unable to delete inventory" });
  }
};
