const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrders,
  getMyOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

// user
router.post("/", protect, createOrder);
router.get("/my-orders", protect, getMyOrders);

// admin
router.get("/", protect, adminOnly, getOrders);
router.patch("/:id/status", protect, adminOnly, updateOrderStatus);

module.exports = router;