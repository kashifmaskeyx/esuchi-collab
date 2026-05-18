const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../controllers/productController");
const { protect, requireApprovedCompany } = require("../middlewares/authMiddleware");

const upload = multer({ storage: multer.memoryStorage() });

router.use(protect, requireApprovedCompany);

router.post("/", controller.createProduct);
router.get("/", controller.getProducts);
router.put("/:id", controller.updateProduct);
router.delete("/:id", controller.deleteProduct);
router.post("/bulk", upload.single("file"), controller.bulkCreateProducts);

module.exports = router;
