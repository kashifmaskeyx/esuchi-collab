// controllers/shipmentController.js
const Shipment = require("../models/shipmentModel");
const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middlewares/authMiddleware");


// GET all shipments
exports.getShipments = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const shipments = await Shipment.find(query)
      .populate("products.product", "name code")
      .populate("createdBy", "name")
      .sort("-createdAt");
    res.json({ success: true, count: shipments.length, data: shipments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET single shipment
exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
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

// POST create shipment (admin only)
exports.createShipment = async (req, res) => {
  try {
    const shipment = await Shipment.create({
      ...req.body,
      createdBy: req.user._id,
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

    const shipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!shipment)
      return res
        .status(404)
        .json({ success: false, message: "Shipment not found" });

    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE shipment (admin only)
exports.deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndDelete(req.params.id);

    if (!shipment)
      return res
        .status(404)
        .json({ success: false, message: "Shipment not found" });

    res.json({ success: true, message: "Shipment deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
