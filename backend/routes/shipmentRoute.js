// routes/shipmentRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
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

// POST create shipment
router.post("/", protect, createShipment);

// PATCH update shipment status
router.patch("/:id/status", protect, updateShipmentStatus);

// DELETE shipment
router.delete("/:id", protect, deleteShipment);

module.exports = router;
