const express = require("express");
const router = express.Router();

const {
  createMovement,
  getMovements,
  getMovementsByProduct,
  deleteMovement,
} = require("../controllers/stockMovementController");

const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect, createMovement);
router.get("/", getMovements);
router.get("/product/:productId", getMovementsByProduct);
router.delete("/:id", deleteMovement);

module.exports = router;