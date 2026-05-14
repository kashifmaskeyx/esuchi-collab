const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { createReturn, getReturns } = require("../controllers/returnController");

router.use(protect);

router.get("/", getReturns);
router.post("/", createReturn);

module.exports = router;
