const Product = require("../models/productModel");
const Inventory = require("../models/inventoryModel");
const Order = require("../models/orderModel");
const Shipment = require("../models/shipmentModel");
const StockMovement = require("../models/stockMovementModel");

const PRODUCT_FIELDS = ["name", "price", "category", "supplier", "description"];

const toNonNegativeNumber = (value, fieldName) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    const error = new Error(`${fieldName} must be 0 or greater`);
    error.statusCode = 400;
    throw error;
  }

  return numberValue;
};

const pickProductUpdates = (body) => {
  const updates = {};

  for (const field of PRODUCT_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (updates.name !== undefined) {
    updates.name = String(updates.name).trim();
    if (!updates.name) {
      const error = new Error("Product name is required");
      error.statusCode = 400;
      throw error;
    }
  }

  if (updates.price !== undefined) {
    updates.price = toNonNegativeNumber(updates.price, "Price");
  }

  return updates;
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const productPayload = pickProductUpdates(req.body);
    const quantity = toNonNegativeNumber(req.body.quantity ?? 0, "Quantity");

    if (productPayload.price === undefined) {
      return res.status(400).json({ message: "Price is required" });
    }

    const product = await Product.create({
      ...productPayload,
      quantity,
      user: req.user._id,
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

exports.bulkCreateProducts = async (req, res) => {
  try {
    const products = req.body.products;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required",
      });
    }

    const formattedProducts = products.map((p, index) => {
      if (!p.name || p.price === undefined || p.price === null) {
        const error = new Error(`Invalid product at index ${index}`);
        error.statusCode = 400;
        throw error;
      }

      const productPayload = pickProductUpdates(p);
      const quantity = toNonNegativeNumber(p.quantity ?? 0, "Quantity");

      return {
        ...productPayload,
        quantity,
        user: req.user._id,
      };
    });

    const createdProducts = await Product.insertMany(formattedProducts);

    res.status(201).json({
      success: true,
      count: createdProducts.length,
      data: createdProducts,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Unable to create products",
    });
  }
};

// Get all products with pagination
exports.getProducts = async (req, res) => {
  try {
    // Current page
    const page = parseInt(req.query.page) || 1;

    // Products per page
    const limit = 10;

    // Skip calculation
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    const shouldPaginate = req.query.page !== undefined;

    // Total products count
    const totalProducts = await Product.countDocuments(query);

    let productsQuery = Product.find(query).sort({ createdAt: -1 });

    if (shouldPaginate) {
      productsQuery = productsQuery.skip(skip).limit(limit);
    }

    const products = await productsQuery;

    res.json({
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      products,
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to load products" });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const updates = pickProductUpdates(req.body);

    const updated = await Product.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(error.statusCode || 400).json({
      message: error.statusCode ? error.message : "Unable to update product",
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [orderRef, shipmentRef, movementRef] = await Promise.all([
      Order.exists({ user: req.user._id, "orderItems.product": product._id }),
      Shipment.exists({ createdBy: req.user._id, "products.product": product._id }),
      StockMovement.exists({ user: req.user._id, product: product._id }),
    ]);

    if (orderRef || shipmentRef || movementRef) {
      return res.status(409).json({
        message:
          "Product is used in orders, shipments, or stock history and cannot be deleted.",
      });
    }

    await Inventory.findOneAndDelete({
      product: product._id,
      user: req.user._id,
    });
    await Product.findOneAndDelete({
      _id: product._id,
      user: req.user._id,
    });

    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete product" });
  }
};
