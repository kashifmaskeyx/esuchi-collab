const AuditLog = require("../models/auditlogModel");
const { companyQuery } = require("../utils/tenant");

exports.getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = companyQuery(req);
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.action) query.action = req.query.action;
    if (req.query.entity) query.entity = req.query.entity;
    if (req.query.entityId) query.entityId = req.query.entityId;

    const totalLogs = await AuditLog.countDocuments(query);
    const auditLogs = await AuditLog.find(query)
      .populate("userId", "name email")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: auditLogs.length,
      totalLogs,
      totalPages: Math.ceil(totalLogs / limit),
      currentPage: page,
      data: auditLogs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAuditLogById = async (req, res) => {
  try {
    const auditLog = await AuditLog.findOne(
      companyQuery(req, { _id: req.params.id }),
    ).populate("userId", "name email");

    if (!auditLog) {
      return res
        .status(404)
        .json({ success: false, message: "Audit log not found" });
    }

    res.json({ success: true, data: auditLog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
