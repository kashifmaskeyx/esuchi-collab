const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrders,
  getMyOrders,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/orderController");

const {
  protect,
  adminOnly,
  requireApprovedCompany,
} = require("../middlewares/authMiddleware");

// user
router.post("/", protect, requireApprovedCompany, createOrder);
router.get("/my-orders", protect, requireApprovedCompany, getMyOrders);
router.patch("/:id/status", protect, requireApprovedCompany, updateOrderStatus);
router.delete("/:id", protect, requireApprovedCompany, deleteOrder);

// admin
router.get("/", protect, adminOnly, getOrders);

module.exports = router;