const express = require("express");
const router = express.Router();
const controller = require("../controllers/productController");

router.post("/", controller.createProduct);
router.get("/", controller.getProducts);
router.put("/:id", controller.updateProduct);
router.delete("/:id", controller.deleteProduct);
router.post("/bulk", controller.bulkCreateProducts);

module.exports = router;
