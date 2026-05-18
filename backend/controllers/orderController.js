const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Inventory = require("../models/inventoryModel");
const createAuditLog = require("../utils/auditLogger");
const {
  actorFields,
  companyQuery,
  isCompanyAdmin,
} = require("../utils/tenant");

const orderAccessQuery = (req, query = {}) =>
  isCompanyAdmin(req)
    ? companyQuery(req, query)
    : companyQuery(req, { ...query, user: req.user._id });

const productQuery = (req, productId) =>
  companyQuery(req, { _id: productId });

const inventoryQuery = (req, productId, extra = {}) =>
  companyQuery(req, { product: productId, ...extra });

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

const buildOrderItems = (orderItems) => {
  const itemsByProduct = new Map();

  for (let i = 0; i < orderItems.length; i++) {
    const item = orderItems[i];
    const quantity = Number(item.quantity);

    if (!item.product) {
      const error = new Error(`Missing product in orderItems[${i}]`);
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      const error = new Error(`Invalid quantity in orderItems[${i}]`);
      error.statusCode = 400;
      throw error;
    }

    const productId = String(item.product);
    const existing = itemsByProduct.get(productId);

    itemsByProduct.set(productId, {
      product: item.product,
      quantity: (existing?.quantity || 0) + quantity,
    });
  }

  return Array.from(itemsByProduct.values());
};

const restoreStock = async (items, req, session) => {
  await Promise.all(
    items.map(async (item) => {
      const inventory = await Inventory.findOneAndUpdate(
        inventoryQuery(req, item.product),
        {
          $inc: { currentStock: item.quantity },
          lastUpdated: Date.now(),
        },
        { new: true, session },
      );

      if (inventory) {
        await Product.findOneAndUpdate(
          productQuery(req, item.product),
          { quantity: inventory.currentStock },
          { runValidators: true, session },
        );
      }
    }),
  );
};

exports.createOrder = async (req, res) => {
  try {
    const { orderItems } = req.body;

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items provided" });
    }

    const order = await withTransaction(async (session) => {
      const normalizedItems = buildOrderItems(orderItems);
      const itemsWithPrice = [];

      for (const item of normalizedItems) {
        const product = await Product.findOne(
          productQuery(req, item.product),
        ).session(session);

        if (!product) {
          const error = new Error(`Product not found: ${item.product}`);
          error.statusCode = 404;
          throw error;
        }

        const inventory = await Inventory.findOne(
          inventoryQuery(req, item.product),
        ).session(session);

        if (!inventory) {
          const error = new Error(`Inventory not found for product: ${product.name}`);
          error.statusCode = 404;
          throw error;
        }

        if (inventory.currentStock < item.quantity) {
          const error = new Error(`Insufficient stock for ${product.name}`);
          error.statusCode = 400;
          throw error;
        }

        const price = Number(product.price);
        if (!Number.isFinite(price) || price < 0) {
          const error = new Error(`Invalid product price for ${product.name}`);
          error.statusCode = 400;
          throw error;
        }

        itemsWithPrice.push({
          product: item.product,
          quantity: item.quantity,
          price,
        });
      }

      const totalAmount = itemsWithPrice.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      if (!Number.isFinite(totalAmount)) {
        const error = new Error("Invalid total amount");
        error.statusCode = 400;
        throw error;
      }

      for (const item of itemsWithPrice) {
        const inventory = await Inventory.findOneAndUpdate(
          inventoryQuery(req, item.product, {
            currentStock: { $gte: item.quantity },
          }),
          {
            $inc: { currentStock: -item.quantity },
            lastUpdated: Date.now(),
          },
          { new: true, session },
        );

        if (!inventory) {
          const error = new Error("Insufficient stock");
          error.statusCode = 400;
          throw error;
        }

        await Product.findOneAndUpdate(
          productQuery(req, item.product),
          { quantity: inventory.currentStock },
          { runValidators: true, session },
        );
      }

      const [createdOrder] = await Order.create(
        [
          {
            ...actorFields(req),
            orderItems: itemsWithPrice,
            totalAmount,
          },
        ],
        { session },
      );

      return createdOrder;
    });

    await createAuditLog({
      userId: req.user._id,
      action: "CREATE_ORDER",
      entity: "Order",
      entityId: order._id,
      newData: order.toObject ? order.toObject() : order,
      req,
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      message: err.statusCode ? err.message : "Unable to create order",
    });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const query = companyQuery(req);
    const totalOrders = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate("orderItems.product", "name price")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: orders.length,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      data: orders,
    });
  } catch (err) {
    res.status(500).json({ message: "Unable to load orders" });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const query = companyQuery(req, { user: req.user._id });
    const totalOrders = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate("orderItems.product", "name price")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: orders.length,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      data: orders,
    });
  } catch (err) {
    res.status(500).json({ message: "Unable to load orders" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "shipped", "delivered"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const query = orderAccessQuery(req, { _id: req.params.id });
    const oldOrder = await Order.findOne(query);

    if (!oldOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = await Order.findOneAndUpdate(query, { status }, { new: true });

    await createAuditLog({
      userId: req.user._id,
      action: "UPDATE_ORDER_STATUS",
      entity: "Order",
      entityId: order._id,
      oldData: oldOrder.toObject ? oldOrder.toObject() : oldOrder,
      newData: order.toObject ? order.toObject() : order,
      req,
    });

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    res.status(500).json({ message: "Unable to update order status" });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await withTransaction(async (session) => {
      const deletedOrder = await Order.findOneAndDelete(
        orderAccessQuery(req, { _id: req.params.id }),
      ).session(session);

      if (!deletedOrder) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }

      await restoreStock(deletedOrder.orderItems, req, session);
      return deletedOrder;
    });

    await createAuditLog({
      userId: req.user._id,
      action: "DELETE_ORDER",
      entity: "Order",
      entityId: order._id,
      oldData: order.toObject ? order.toObject() : order,
      req,
    });

    res.json({
      success: true,
      message: "Order deleted",
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      message: err.statusCode ? err.message : "Unable to delete order",
    });
  }
};
