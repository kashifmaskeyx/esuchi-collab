const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");
const {
  getAuditLogs,
  getAuditLogById,
} = require("../controllers/auditLogController");

router.get("/", protect, authorize("admin"), getAuditLogs);
router.get("/:id", protect, authorize("admin"), getAuditLogById);

module.exports = router;
