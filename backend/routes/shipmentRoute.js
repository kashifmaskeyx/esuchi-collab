// routes/shipmentRoutes.js
const express = require("express");
const router = express.Router();
const {
  protect,
  requireApprovedCompany,
} = require("../middlewares/authMiddleware");
const {
  getShipments,
  getShipmentById,
  createShipment,
  updateShipmentStatus,
  deleteShipment,
} = require("../controllers/shipmentController");

router.use(protect, requireApprovedCompany);

// GET all shipments
router.get("/", getShipments);

// GET single shipment
router.get("/:id", getShipmentById);

// POST create shipment
router.post("/", createShipment);

// PATCH update shipment status
router.patch("/:id/status", updateShipmentStatus);

// DELETE shipment
router.delete("/:id", deleteShipment);

module.exports = router;
