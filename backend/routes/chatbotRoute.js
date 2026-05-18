const express = require("express");
const router = express.Router();
const { protect, requireApprovedCompany } = require("../middlewares/authMiddleware");
const { chat } = require("../controllers/chatbotController");

router.post("/message", protect, requireApprovedCompany, chat);

module.exports = router;
