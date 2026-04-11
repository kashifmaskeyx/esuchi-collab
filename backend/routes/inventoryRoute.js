const express = require("express");
const router = express.Router();

const {
  createInventory,
  getInventories,
  getInventoryById,
  updateStock,
  updateMinimumStock,
  deleteInventory,
} = require("../controllers/inventoryController");

router.post("/", createInventory);
router.get("/", getInventories);
router.get("/:id", getInventoryById);
router.patch("/:id/stock", updateStock);
router.patch("/:id/minimum", updateMinimumStock);
router.delete("/:id", deleteInventory);

module.exports = router;