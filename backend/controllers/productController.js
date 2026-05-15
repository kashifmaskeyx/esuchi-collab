const Product = require("../models/productModel");
const createAuditLog = require("../utils/auditLogger");

// Create product
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      user: req.user._id,
    });

    await createAuditLog({
      userId: req.user._id,
      action: "CREATE_PRODUCT",
      entity: "Product",
      entityId: product._id,
      newData: product.toObject ? product.toObject() : product,
      req,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
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

    // Optional validation
    const formattedProducts = products.map((p, index) => {
      if (!p.name || !p.price) {
        throw new Error(`Invalid product at index ${index}`);
      }

      return {
        name: p.name,
        quantity: p.quantity ?? 0,
        price: p.price,
        category: p.category || null,
        supplier: p.supplier || null,
        description: p.description || null,
      };
    });

    const createdProducts = await Product.insertMany(
      formattedProducts.map((product) => ({
        ...product,
        user: req.user._id,
      })),
    );

    await createAuditLog({
      userId: req.user._id,
      action: "BULK_CREATE_PRODUCTS",
      entity: "Product",
      newData: {
        totalProducts: createdProducts.length,
        createdIds: createdProducts.map((product) => product._id),
      },
      req,
    });

    res.status(201).json({
      success: true,
      count: createdProducts.length,
      data: createdProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
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

    // Total products count
    const totalProducts = await Product.countDocuments();

    // Fetch paginated products
    const products = await Product.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      products,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const oldProduct = await Product.findById(req.params.id);

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    await createAuditLog({
      userId: req.user._id,
      action: "UPDATE_PRODUCT",
      entity: "Product",
      entityId: updated._id,
      oldData: oldProduct ? oldProduct.toObject() : null,
      newData: updated ? updated.toObject() : null,
      req,
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);

    await createAuditLog({
      userId: req.user._id,
      action: "DELETE_PRODUCT",
      entity: "Product",
      entityId: deleted._id,
      oldData: deleted ? deleted.toObject() : null,
      req,
    });

    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
