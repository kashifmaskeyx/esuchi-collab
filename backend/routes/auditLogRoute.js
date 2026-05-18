const express = require("express");
const router = express.Router();
const { protect, requireApprovedCompany, authorize } = require("../middlewares/authMiddleware");
const {
  getAuditLogs,
  getAuditLogById,
} = require("../controllers/auditLogController");

router.get("/", protect, requireApprovedCompany, authorize("admin"), getAuditLogs);
router.get("/:id", protect, requireApprovedCompany, authorize("admin"), getAuditLogById);

module.exports = router;
