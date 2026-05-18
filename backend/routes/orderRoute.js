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
  requireApprovedCompany,
  authorize,
} = require("../middlewares/authMiddleware");

// user/staff/admin
router.post(
  "/",
  protect,
  requireApprovedCompany,
  authorize("user", "staff", "manager", "admin"),
  createOrder,
);
router.get(
  "/my-orders",
  protect,
  requireApprovedCompany,
  authorize("user", "staff", "manager", "admin"),
  getMyOrders,
);
router.patch(
  "/:id/status",
  protect,
  requireApprovedCompany,
  authorize("staff", "manager", "admin"),
  updateOrderStatus,
);
router.delete(
  "/:id",
  protect,
  requireApprovedCompany,
  authorize("staff", "manager", "admin"),
  deleteOrder,
);

// admin
router.get("/", protect, requireApprovedCompany, authorize("admin"), getOrders);

module.exports = router;
