// controllers/shipmentController.js
const Shipment = require("../models/shipmentModel");
const Product = require("../models/productModel");
const Supplier = require("../models/supplierModel");
const createAuditLog = require("../utils/auditLogger");

// GET all shipments
exports.getShipments = async (req, res) => {
  try {
    const { status, page = 1 } = req.query;

    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;

    // filter
    const query = status ? { status } : {};

    // total count (for pagination info)
    const totalShipments = await Shipment.countDocuments(query);

    const shipments = await Shipment.find(query)
      .populate("products.product", "name code")
      .populate("createdBy", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: shipments.length,
      totalShipments,
      totalPages: Math.ceil(totalShipments / limit),
      currentPage: parseInt(page),
      data: shipments,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET single shipment
exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    })
      .populate("products.product", "name code unit")
      .populate("createdBy", "name");

    if (!shipment)
      return res
        .status(404)
        .json({ success: false, message: "Shipment not found" });

    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST create shipment
exports.createShipment = async (req, res) => {
  try {
    const { supplier, products } = req.body;

    const supplierRecord = await Supplier.findOne({
      _id: supplier,
      user: req.user._id,
    });

    if (!supplierRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one product is required" });
    }

    const productIds = products.map((item) => item.product).filter(Boolean);

    if (productIds.length !== products.length) {
      return res
        .status(400)
        .json({ success: false, message: "Each product entry is required" });
    }

    const uniqueProductIds = [...new Set(productIds.map(String))];
    const userProductsCount = await Product.countDocuments({
      _id: { $in: uniqueProductIds },
      user: req.user._id,
    });

    if (userProductsCount !== uniqueProductIds.length) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const shipment = await Shipment.create({
      ...req.body,
      createdBy: req.user._id,
    });

    await createAuditLog({
      userId: req.user._id,
      action: "CREATE_SHIPMENT",
      entity: "Shipment",
      entityId: shipment._id,
      newData: shipment.toObject ? shipment.toObject() : shipment,
      req,
    });

    res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH update shipment status
exports.updateShipmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "in_transit", "delivered", "cancelled"];

    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const oldShipment = await Shipment.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!oldShipment)
      return res
        .status(404)
        .json({ success: false, message: "Shipment not found" });

    const shipment = await Shipment.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true },
    );

    await createAuditLog({
      userId: req.user._id,
      action: "UPDATE_SHIPMENT_STATUS",
      entity: "Shipment",
      entityId: shipment._id,
      oldData: oldShipment.toObject(),
      newData: shipment.toObject(),
      req,
    });

    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE shipment
exports.deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!shipment)
      return res
        .status(404)
        .json({ success: false, message: "Shipment not found" });

    await createAuditLog({
      userId: req.user._id,
      action: "DELETE_SHIPMENT",
      entity: "Shipment",
      entityId: shipment._id,
      oldData: shipment.toObject ? shipment.toObject() : shipment,
      req,
    });

    res.json({ success: true, message: "Shipment deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
