const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const Shipment = require("../models/shippmentModel");

// GET all shipments
router.get("/", protect, async (req, res) => {
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
});
// GET single shipment
router.get("/:id", protect, async (req, res) => {
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
});

// POST create shipment (admin)
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const shipment = await Shipment.create({
      ...req.body,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH update shipment status
router.patch("/:id/status", protect, async (req, res) => {
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
});

// DELETE shipment (admin)
router.delete("/:id", protect, adminOnly, async (req, res) => {
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
});

module.exports = router;
