const Product = require("../models/productModel");
const createAuditLog = require("../utils/auditLogger");

const parseCsvLine = (line) => {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const toNumberOrDefault = (value, defaultValue) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
};

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
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required in 'file' field",
      });
    }

    const csvText = req.file.buffer.toString("utf-8").replace(/^\uFEFF/, "");
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: "CSV must include a header and at least one data row",
      });
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const requiredHeaders = ["name", "price"];

    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        return res.status(400).json({
          success: false,
          message: `Missing required CSV column: ${header}`,
        });
      }
    }

    const getCell = (row, key) => {
      const index = headers.indexOf(key);
      if (index < 0) return "";
      return (row[index] ?? "").trim();
    };

    const formattedProducts = lines.slice(1).map((line, rowIndex) => {
      const row = parseCsvLine(line);
      const rowNumber = rowIndex + 2;

      const name = getCell(row, "name");
      const price = toNumberOrDefault(getCell(row, "price"), NaN);
      const quantity = toNumberOrDefault(getCell(row, "quantity"), 0);

      if (!name) {
        throw new Error(`Missing name at CSV row ${rowNumber}`);
      }
      if (!Number.isFinite(price)) {
        throw new Error(`Invalid price at CSV row ${rowNumber}`);
      }
      if (!Number.isFinite(quantity)) {
        throw new Error(`Invalid quantity at CSV row ${rowNumber}`);
      }

      return {
        name,
        quantity,
        price,
        category: getCell(row, "category") || null,
        supplier: getCell(row, "supplier") || null,
        description: getCell(row, "description") || null,
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
