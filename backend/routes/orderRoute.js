const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrders,
  getMyOrders,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/orderController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

// user
router.post("/", protect, createOrder);
router.get("/my-orders", protect, getMyOrders);
router.patch("/:id/status", protect, updateOrderStatus);
router.delete("/:id", protect, deleteOrder);

// admin
router.get("/", protect, adminOnly, getOrders);

module.exports = router;
