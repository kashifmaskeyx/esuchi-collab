const AuditLog = require("../models/auditlogModel");

const createAuditLog = async ({
  userId,
  action,
  entity,
  entityId,
  oldData = null,
  newData = null,
  details = null,
  req,
}) => {
  try {
    const auditData = {
      userId,
      action,
      entity,
      entityId,
      oldData,
      newData: newData ?? details,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    };

    await AuditLog.create(auditData);
  } catch (error) {
    console.error("Audit Log Error:", error.message);
  }
};

module.exports = createAuditLog;
