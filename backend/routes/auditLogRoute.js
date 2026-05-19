const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  getAuditLogs,
  getAuditLogById,
} = require("../controllers/auditLogController");

router.get("/", protect, adminOnly, getAuditLogs);
router.get("/:id", protect, adminOnly, getAuditLogById);

module.exports = router;
