const express = require("express");
const router = express.Router();
const {
  protect,
  requireApprovedCompany,
} = require("../middlewares/authMiddleware");
const { createReturn, getReturns } = require("../controllers/returnController");

router.use(protect, requireApprovedCompany);

router.get("/", getReturns);
router.post("/", createReturn);

module.exports = router;
