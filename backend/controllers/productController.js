const Product = require("../models/productModel");
const Inventory = require("../models/inventoryModel");
const Order = require("../models/orderModel");
const Shipment = require("../models/shipmentModel");
const StockMovement = require("../models/stockMovementModel");
const createAuditLog = require("../utils/auditLogger");
const { actorFields, companyQuery, getCompanyId } = require("../utils/tenant");

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
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : NaN;
};

const formatProduct = (product, req) => ({
  ...pickProductUpdates(product),
  quantity: toNonNegativeNumber(product.quantity ?? 0, "Quantity"),
  ...actorFields(req),
});

exports.createProduct = async (req, res) => {
  try {
    const productPayload = formatProduct(req.body, req);

    if (productPayload.price === undefined) {
      return res.status(400).json({ message: "Price is required" });
    }

    const product = await Product.create(productPayload);

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
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

exports.bulkCreateProducts = async (req, res) => {
  try {
    let formattedProducts = [];

    if (req.file?.buffer) {
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

      const headers = parseCsvLine(lines[0]).map((header) =>
        header.toLowerCase(),
      );

      for (const header of ["name", "price"]) {
        if (!headers.includes(header)) {
          return res.status(400).json({
            success: false,
            message: `Missing required CSV column: ${header}`,
          });
        }
      }

      const getCell = (row, key) => {
        const index = headers.indexOf(key);
        return index < 0 ? "" : (row[index] ?? "").trim();
      };

      formattedProducts = lines.slice(1).map((line, rowIndex) => {
        const row = parseCsvLine(line);
        const rowNumber = rowIndex + 2;
        const name = getCell(row, "name");
        const price = toNumberOrDefault(getCell(row, "price"), NaN);
        const quantity = toNumberOrDefault(getCell(row, "quantity"), 0);

        if (!name) {
          const error = new Error(`Missing name at CSV row ${rowNumber}`);
          error.statusCode = 400;
          throw error;
        }

        if (!Number.isFinite(price)) {
          const error = new Error(`Invalid price at CSV row ${rowNumber}`);
          error.statusCode = 400;
          throw error;
        }

        if (!Number.isFinite(quantity) || quantity < 0) {
          const error = new Error(`Invalid quantity at CSV row ${rowNumber}`);
          error.statusCode = 400;
          throw error;
        }

        return {
          name,
          price,
          quantity,
          category: getCell(row, "category"),
          supplier: getCell(row, "supplier"),
          description: getCell(row, "description"),
          ...actorFields(req),
        };
      });
    } else {
      const products = req.body.products;

      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Products array or CSV file is required",
        });
      }

      formattedProducts = products.map((product, index) => {
        if (
          !product.name ||
          product.price === undefined ||
          product.price === null
        ) {
          const error = new Error(`Invalid product at index ${index}`);
          error.statusCode = 400;
          throw error;
        }

        return formatProduct(product, req);
      });
    }

    const createdProducts = await Product.insertMany(formattedProducts);

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
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Unable to create products",
    });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const query = companyQuery(req);
    const shouldPaginate = req.query.page !== undefined;
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

exports.updateProduct = async (req, res) => {
  try {
    const updates = pickProductUpdates(req.body);
    const oldProduct = await Product.findOne(
      companyQuery(req, { _id: req.params.id }),
    );

    if (!oldProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updated = await Product.findOneAndUpdate(
      companyQuery(req, { _id: req.params.id }),
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    await createAuditLog({
      userId: req.user._id,
      action: "UPDATE_PRODUCT",
      entity: "Product",
      entityId: updated._id,
      oldData: oldProduct.toObject ? oldProduct.toObject() : oldProduct,
      newData: updated.toObject ? updated.toObject() : updated,
      req,
    });

    res.json(updated);
  } catch (error) {
    res.status(error.statusCode || 400).json({
      message: error.statusCode ? error.message : "Unable to update product",
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne(
      companyQuery(req, { _id: req.params.id }),
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const companyId = getCompanyId(req);
    const [orderRef, shipmentRef, movementRef] = await Promise.all([
      Order.exists({ company: companyId, "orderItems.product": product._id }),
      Shipment.exists({ company: companyId, "products.product": product._id }),
      StockMovement.exists({ company: companyId, product: product._id }),
    ]);

    if (orderRef || shipmentRef || movementRef) {
      return res.status(409).json({
        message:
          "Product is used in orders, shipments, or stock history and cannot be deleted.",
      });
    }

    await Inventory.findOneAndDelete({
      product: product._id,
      company: companyId,
    });
    await Product.findOneAndDelete(companyQuery(req, { _id: product._id }));

    await createAuditLog({
      userId: req.user._id,
      action: "DELETE_PRODUCT",
      entity: "Product",
      entityId: product._id,
      oldData: product.toObject ? product.toObject() : product,
      req,
    });

    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete product" });
  }
};
