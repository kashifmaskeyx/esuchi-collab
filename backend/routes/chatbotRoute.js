const express = require("express");
const router = express.Router();
const { protect, requireApprovedCompany } = require("../middlewares/authMiddleware");
const { chat, landingChat } = require("../controllers/chatbotController");

router.post("/landing/message", landingChat);
router.post("/message", protect, requireApprovedCompany, chat);

module.exports = router;
