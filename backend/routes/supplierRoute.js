const express = require("express");
const router = express.Router();

const {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.post("/", createSupplier);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

// All logged-in users
router.get("/", getSuppliers);
router.get("/:id", getSupplierById);

module.exports = router;
