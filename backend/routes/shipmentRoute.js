// routes/shipmentRoutes.js
const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  getShipments,
  getShipmentById,
  createShipment,
  updateShipmentStatus,
  deleteShipment,
} = require("../controllers/shipmentController");

// GET all shipments
router.get("/", protect, getShipments);

// GET single shipment
router.get("/:id", protect, getShipmentById);

// POST create shipment (admin only)
router.post("/", protect, adminOnly, createShipment);

// PATCH update shipment status
router.patch("/:id/status", protect, updateShipmentStatus);

// DELETE shipment (admin only)
router.delete("/:id", protect, adminOnly, deleteShipment);

module.exports = router;
