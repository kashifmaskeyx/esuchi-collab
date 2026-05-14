const express = require("express");
const router = express.Router();
const controller = require("../controllers/productController");
const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.post("/", controller.createProduct);
router.get("/", controller.getProducts);
router.put("/:id", controller.updateProduct);
router.delete("/:id", controller.deleteProduct);

module.exports = router;
