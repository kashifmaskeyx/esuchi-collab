const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Inventory = require("../models/inventoryModel");

exports.createOrder = async (req, res) => {
  try {
    const { orderItems } = req.body;

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items provided" });
    }

    let totalAmount = 0;

    const itemsWithPrice = [];

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const quantity = Number(item.quantity);

      if (!item.product) {
        return res.status(400).json({
          message: `Missing product in orderItems[${i}]`,
        });
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: `Invalid quantity in orderItems[${i}]`,
        });
      }

      const product = await Product.findById(item.product);
      const inventory = await Inventory.findOne({ product: item.product });

      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.product}`,
        });
      }

      if (!inventory) {
        return res.status(404).json({
          message: `Inventory not found for product: ${product.name}`,
        });
      }

      if (inventory.currentStock < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
        });
      }

      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          message: `Invalid product price for ${product.name}`,
        });
      }

      const itemWithPrice = {
        product: item.product,
        quantity,
        price,
      };

      totalAmount += price * quantity;

      itemsWithPrice.push(itemWithPrice);
    }

    if (!Number.isFinite(totalAmount)) {
      return res.status(400).json({ message: "Invalid total amount" });
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems: itemsWithPrice,
      totalAmount,
    });

    // update stock
    for (let item of itemsWithPrice) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity },
      });

      await Inventory.findOneAndUpdate(
        { product: item.product },
        {
          $inc: { currentStock: -item.quantity },
          lastUpdated: Date.now(),
        },
      );
    }

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//admin
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("orderItems.product", "name price");

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
//user
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate(
      "orderItems.product",
      "name price",
    );

    res.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
//admin update
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowed = ["pending", "shipped", "delivered"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
//amin delete
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      success: true,
      message: "Order deleted",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
