const mongoose = require("mongoose");
const StockMovement = require("../models/stockMovementModel");
const Inventory = require("../models/inventoryModel");
const Product = require("../models/productModel");
const createAuditLog = require("../utils/auditLogger");
const { actorFields, companyQuery } = require("../utils/tenant");

const productQuery = (req, productId) => companyQuery(req, { _id: productId });

const inventoryQuery = (req, productId) =>
  companyQuery(req, { product: productId });

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
// CREATE stock movement
//
exports.createMovement = async (req, res) => {
  try {
    const { product, movementType, quantity, movementDate, confirmLowStock } =
      req.body;

    const numericQuantity = Number(quantity);

    if (!Number.isFinite(numericQuantity) || numericQuantity < 1) {
      return res
        .status(400)
        .json({ message: "Quantity must be a number greater than 0" });
    }

    const parsedMovementDate = movementDate
      ? new Date(movementDate)
      : new Date();

    if (Number.isNaN(parsedMovementDate.getTime())) {
      return res.status(400).json({ message: "Invalid movement date" });
    }

    if (!["IN", "OUT", "ADJUSTMENT"].includes(movementType)) {
      return res.status(400).json({ message: "Invalid movement type" });
    }

    const movement = await withTransaction(async (session) => {
      const inventory = await Inventory.findOne(
        inventoryQuery(req, product),
      ).session(session);

      if (!inventory) {
        const error = new Error("Inventory not found");
        error.statusCode = 404;
        throw error;
      }

      const productRecord = await Product.findOne(
        productQuery(req, product),
      ).session(session);

      if (!productRecord) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
      }

      let updatedStock = inventory.currentStock;

      if (movementType === "IN") {
        updatedStock += numericQuantity;
      } else if (movementType === "OUT") {
        if (inventory.currentStock < numericQuantity) {
          const error = new Error("Insufficient stock");
          error.statusCode = 400;
          throw error;
        }

        updatedStock -= numericQuantity;

        if (updatedStock < inventory.minimumStock && !confirmLowStock) {
          const error = new Error(
            "This stock out will reduce stock below the minimum level. Confirm to continue.",
          );
          error.statusCode = 409;
          error.warning = true;
          error.data = {
            product: productRecord.name,
            currentStock: inventory.currentStock,
            projectedStock: updatedStock,
            minimumStock: inventory.minimumStock,
          };
          throw error;
        }
      } else {
        updatedStock = numericQuantity;
      }

      inventory.currentStock = updatedStock;
      inventory.lastUpdated = Date.now();
      await inventory.save({ session });

      productRecord.quantity = updatedStock;
      await productRecord.save({ session });

      const [createdMovement] = await StockMovement.create(
        [
          {
            product,
            ...actorFields(req),
            movementType,
            quantity: numericQuantity,
            movementDate: parsedMovementDate,
          },
        ],
        { session },
      );

      return createdMovement;
    });

    await createAuditLog({
      userId: req.user._id,
      action: "CREATE_STOCK_MOVEMENT",
      entity: "StockMovement",
      entityId: movement._id,
      newData: movement.toObject ? movement.toObject() : movement,
      req,
    });

    res.status(201).json({
      success: true,
      data: movement,
    });
  } catch (err) {
    if (err.warning) {
      return res.status(err.statusCode).json({
        warning: true,
        message: err.message,
        data: err.data,
      });
    }

    res.status(err.statusCode || 500).json({
      message: err.statusCode ? err.message : "Unable to create stock movement",
    });
  }
};

//
// GET all movements
//
exports.getMovements = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = companyQuery(req);

    const totalMovements = await StockMovement.countDocuments(query);

    const movements = await StockMovement.find(query)
      .populate("product", "name")
      .populate("user", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: movements.length,
      totalMovements,
      totalPages: Math.ceil(totalMovements / limit),
      currentPage: page,
      data: movements,
    });
  } catch (err) {
    res.status(500).json({ message: "Unable to load stock movements" });
  }
};

//
// GET movements by product
//
exports.getMovementsByProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = companyQuery(req, { product: req.params.productId });

    const totalMovements = await StockMovement.countDocuments(query);

    const movements = await StockMovement.find(query)
      .populate("product", "name")
      .populate("user", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: movements.length,
      totalMovements,
      totalPages: Math.ceil(totalMovements / limit),
      currentPage: page,
      data: movements,
    });
  } catch (err) {
    res.status(500).json({ message: "Unable to load stock movements" });
  }
};

//
// DELETE movement (optional, usually restricted)
//
exports.deleteMovement = async (req, res) => {
  try {
    const movement = await StockMovement.findOneAndDelete(
      companyQuery(req, { _id: req.params.id }),
    );

    if (!movement) {
      return res.status(404).json({ message: "Movement not found" });
    }

    await createAuditLog({
      userId: req.user._id,
      action: "DELETE_STOCK_MOVEMENT",
      entity: "StockMovement",
      entityId: movement._id,
      oldData: movement.toObject ? movement.toObject() : movement,
      req,
    });

    res.json({ success: true, message: "Movement deleted" });
  } catch (err) {
    res.status(500).json({ message: "Unable to delete stock movement" });
  }
};
