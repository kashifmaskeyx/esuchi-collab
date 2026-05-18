const mongoose = require("mongoose");
const Return = require("../models/returnModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Inventory = require("../models/inventoryModel");
const StockMovement = require("../models/stockMovementModel");
const { actorFields, companyQuery, getCompanyId } = require("../utils/tenant");

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

const getReturnedQuantityForOrderItem = async (
  orderId,
  productId,
  companyId,
  session,
) => {
  const totals = await Return.aggregate([
    {
      $match: {
        order: new mongoose.Types.ObjectId(orderId),
        product: new mongoose.Types.ObjectId(productId),
        company: new mongoose.Types.ObjectId(companyId),
      },
    },
    { $group: { _id: null, quantity: { $sum: "$quantity" } } },
  ]).session(session);

  return totals[0]?.quantity || 0;
};

exports.createReturn = async (req, res) => {
  try {
    const {
      order,
      product,
      quantity,
      condition,
      resolution,
      reason,
      notes,
    } = req.body;

    const numericQuantity = Number(quantity);

    if (
      !product ||
      !mongoose.Types.ObjectId.isValid(product) ||
      !Number.isFinite(numericQuantity) ||
      numericQuantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Product and valid quantity are required",
      });
    }

    if (order && !mongoose.Types.ObjectId.isValid(order)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order",
      });
    }

    if (!["restockable", "damaged", "expired", "lost"].includes(condition)) {
      return res.status(400).json({
        success: false,
        message: "Invalid return condition",
      });
    }

    if (
      !["restocked", "quarantined", "disposed", "refund", "replacement"].includes(
        resolution,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid return resolution",
      });
    }

    if (!reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Return reason is required",
      });
    }

    if (resolution === "restocked" && condition !== "restockable") {
      return res.status(400).json({
        success: false,
        message: "Only restockable returns can be restocked",
      });
    }

    const returnRecord = await withTransaction(async (session) => {
      const productRecord = await Product.findOne({
        _id: product,
        company: getCompanyId(req),
      }).session(session);

      if (!productRecord) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
      }

      let orderRecord = null;

      if (order) {
        orderRecord = await Order.findOne({
          _id: order,
          company: getCompanyId(req),
        }).session(session);

        if (!orderRecord) {
          const error = new Error("Order not found");
          error.statusCode = 404;
          throw error;
        }

        const orderItem = orderRecord.orderItems.find(
          (item) => String(item.product) === String(product),
        );

        if (!orderItem) {
          const error = new Error("Product is not part of this order");
          error.statusCode = 400;
          throw error;
        }

        const alreadyReturned = await getReturnedQuantityForOrderItem(
          order,
          product,
          getCompanyId(req),
          session,
        );

        if (alreadyReturned + numericQuantity > orderItem.quantity) {
          const error = new Error("Return quantity exceeds the ordered quantity");
          error.statusCode = 400;
          throw error;
        }
      }

      const shouldRestock = condition === "restockable" && resolution === "restocked";

      if (shouldRestock) {
        const inventory = await Inventory.findOneAndUpdate(
          companyQuery(req, { product }),
          {
            $inc: { currentStock: numericQuantity },
            lastUpdated: Date.now(),
          },
          { new: true, runValidators: true, session },
        );

        if (!inventory) {
          const error = new Error("Inventory not found for product");
          error.statusCode = 404;
          throw error;
        }

        productRecord.quantity = inventory.currentStock;
        await productRecord.save({ session });
      }

      const [createdReturn] = await Return.create(
        [
          {
            ...actorFields(req),
            order: orderRecord?._id || null,
            product,
            quantity: numericQuantity,
            condition,
            resolution,
            reason: reason.trim(),
            notes: notes?.trim() || "",
            status: "completed",
          },
        ],
        { session },
      );

      await StockMovement.create(
        [
          {
            product,
            ...actorFields(req),
            movementType: shouldRestock ? "RETURN" : "DAMAGED",
            quantity: numericQuantity,
            movementDate: new Date(),
          },
        ],
        { session },
      );

      return createdReturn;
    });

    const populatedReturn = await Return.findOne({
      _id: returnRecord._id,
      company: getCompanyId(req),
    })
      .populate("product", "name price")
      .populate("order", "orderDate status totalAmount");

    res.status(201).json({ success: true, data: populatedReturn });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.statusCode ? err.message : "Unable to record return",
    });
  }
};

exports.getReturns = async (req, res) => {
  try {
    const returns = await Return.find(companyQuery(req))
      .populate("product", "name price")
      .populate("order", "orderDate status totalAmount")
      .sort("-createdAt");

    res.json({ success: true, count: returns.length, data: returns });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Unable to load returns",
    });
  }
};
