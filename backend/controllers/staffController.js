const Staff = require("../models/staffModel");

exports.createStaff = async (req, res) => {
  try {
    const { name, email, role, status, permissions } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Name and email are required" });
    }

    const staff = await Staff.create({
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
      err.code === 11000 ? "Staff email already exists" : err.message;
    res.status(400).json({ success: false, message });
  }
};

exports.getStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ owner: req.user._id }).sort("-createdAt");

    res.json({ success: true, count: staff.length, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.owner;

    if (updates.email) {
      updates.email = updates.email.trim().toLowerCase();
    }

    if (updates.name) {
      updates.name = updates.name.trim();
    }

    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
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
      err.code === 11000 ? "Staff email already exists" : err.message;
    res.status(400).json({ success: false, message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    res.json({ success: true, message: "Staff member removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
