const Product = require("../models/productModel");

// Create product
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
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

    const createdProducts = await Product.insertMany(formattedProducts);

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
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
