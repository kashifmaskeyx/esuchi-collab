const express = require("express");
const router = express.Router();

const {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

// Admin only
router.post("/", protect, adminOnly, createSupplier);
router.put("/:id", protect, adminOnly, updateSupplier);
router.delete("/:id", protect, adminOnly, deleteSupplier);

// All logged-in users
router.get("/", protect, getSuppliers);
router.get("/:id", protect, getSupplierById);

module.exports = router;