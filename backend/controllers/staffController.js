const Staff = require("../models/staffModel");
const User = require("../models/userModel");
const { getCompanyId } = require("../utils/tenant");

const COMPANY_ROLES = ["admin", "manager", "staff", "viewer"];

const formatUserRow = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  membershipStatus: user.membershipStatus,
  status:
    user.membershipStatus === "pending"
      ? "pending"
      : user.isActive
        ? "active"
        : "suspended",
  isActive: user.isActive,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const findCompanyUser = (req, id) =>
  User.findOne({
    _id: id,
    company: getCompanyId(req),
  });

exports.createStaff = async (req, res) => {
  try {
    const { name, email, role, status, permissions } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Name and email are required" });
    }

    const staff = await Staff.create({
      company: getCompanyId(req),
      owner: req.user._id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      status,
      permissions,
    });

    res.status(201).json({ success: true, data: staff });
  } catch (err) {
    const message =
      err.code === 11000 ? "Staff email already exists" : "Unable to create staff member";
    res.status(400).json({ success: false, message });
  }
};

exports.getStaff = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const users = await User.find({ company: companyId })
      .select("name email role membershipStatus isActive isVerified createdAt updatedAt")
      .sort("-createdAt");

    const staffInvites = await Staff.find({ company: companyId }).sort("-createdAt");
    const userEmails = new Set(users.map((user) => user.email));
    const inviteRows = staffInvites
      .filter((staff) => !userEmails.has(staff.email))
      .map((staff) => ({
        ...staff.toObject(),
        source: "invite",
      }));

    const rows = [...users.map(formatUserRow), ...inviteRows];

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Unable to load staff" });
  }
};

exports.getJoinRequests = async (req, res) => {
  try {
    const users = await User.find({
      company: getCompanyId(req),
      membershipStatus: "pending",
    })
      .select("name email role membershipStatus isActive isVerified createdAt updatedAt")
      .sort("-createdAt");

    res.json({
      success: true,
      count: users.length,
      data: users.map(formatUserRow),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Unable to load join requests" });
  }
};

exports.approveStaff = async (req, res) => {
  try {
    const user = await findCompanyUser(req, req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.membershipStatus = "approved";
    user.isActive = true;

    if (!COMPANY_ROLES.includes(user.role) || user.role === "user") {
      user.role = "staff";
    }

    await user.save();

    res.json({
      success: true,
      message: "User approved",
      data: formatUserRow(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Unable to approve user" });
  }
};

exports.rejectStaff = async (req, res) => {
  try {
    const user = await findCompanyUser(req, req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (String(user._id) === String(req.user._id)) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot reject your own account" });
    }

    user.membershipStatus = "rejected";
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: "User rejected",
      data: formatUserRow(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Unable to reject user" });
  }
};

exports.suspendStaff = async (req, res) => {
  try {
    const user = await findCompanyUser(req, req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (String(user._id) === String(req.user._id)) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot suspend your own account" });
    }

    if (user.role === "admin") {
      const adminCount = await User.countDocuments({
        company: getCompanyId(req),
        role: "admin",
        membershipStatus: "approved",
        isActive: true,
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "A company must have at least one active admin",
        });
      }
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: "User suspended",
      data: formatUserRow(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Unable to suspend user" });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const updates = { ...req.body };
    const role = updates.role?.trim?.().toLowerCase();

    const user = await findCompanyUser(req, req.params.id);

    if (user) {
      if (role) {
        if (!COMPANY_ROLES.includes(role)) {
          return res.status(400).json({
            success: false,
            message: "Role must be admin, manager, staff, or viewer",
          });
        }

        if (String(user._id) === String(req.user._id) && role !== "admin") {
          return res.status(400).json({
            success: false,
            message: "You cannot remove your own admin role",
          });
        }

        user.role = role;
      }

      if (updates.status === "active") {
        user.isActive = true;
        user.membershipStatus = "approved";
      }

      if (updates.status === "suspended") {
        user.isActive = false;
      }

      await user.save();
      return res.json({ success: true, data: formatUserRow(user) });
    }

    delete updates.owner;
    delete updates.company;

    if (updates.email) {
      updates.email = updates.email.trim().toLowerCase();
    }

    if (updates.name) {
      updates.name = updates.name.trim();
    }

    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, company: getCompanyId(req) },
      updates,
      { new: true, runValidators: true },
    );

    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    res.json({ success: true, data: staff });
  } catch (err) {
    const message =
      err.code === 11000 ? "Staff email already exists" : "Unable to update staff member";
    res.status(400).json({ success: false, message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const user = await findCompanyUser(req, req.params.id);

    if (user) {
      if (String(user._id) === String(req.user._id)) {
        return res
          .status(400)
          .json({ success: false, message: "You cannot remove your own account" });
      }

      user.membershipStatus = "rejected";
      user.isActive = false;
      await user.save();

      return res.json({ success: true, message: "Staff member removed" });
    }

    const staff = await Staff.findOneAndDelete({
      _id: req.params.id,
      company: getCompanyId(req),
    });

    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    res.json({ success: true, message: "Staff member removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Unable to delete staff member" });
  }
};