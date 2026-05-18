const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrders,
  getMyOrders,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/orderController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// user/staff/admin
router.post("/", protect, authorize("user", "staff", "admin"), createOrder);
router.get("/my-orders", protect, authorize("user", "staff", "admin"), getMyOrders);
router.patch("/:id/status", protect, authorize("staff", "admin"), updateOrderStatus);
router.delete("/:id", protect, authorize("staff", "admin"), deleteOrder);

// admin
router.get("/", protect, authorize("admin"), getOrders);

module.exports = router;
