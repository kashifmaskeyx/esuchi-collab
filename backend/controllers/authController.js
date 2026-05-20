const User = require("../models/userModel");
const Company = require("../models/companyModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const dns = require("dns").promises;
const net = require("net");
const { validationResult } = require("express-validator");
const { sendOtpEmail } = require("../config/mail");
const {
  createCompanyForUser,
  ensureUserCompany,
  migrateLegacyDataForUser,
} = require("../utils/companyProvisioning");
const { getCompanyId } = require("../utils/tenant");

// ================= TOKEN =================
const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

const sendTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COMPANY_ROLES = ["admin", "manager", "staff", "viewer"];

const normalizeJoinCode = (joinCode) =>
  joinCode ? String(joinCode).trim().toUpperCase() : "";

const serializeCompany = (company, role) => {
  if (!company) return null;

  const companyId = company._id || company;
  const payload = {
    _id: companyId,
    id: companyId,
    name: company.name,
    slug: company.slug,
  };

  if (role === "admin") {
    payload.joinCode = company.joinCode;
  }

  return payload;
};

const serializeUser = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  membershipStatus: user.membershipStatus,
  company: serializeCompany(user.company, user.role),
});

const reloadAuthUser = (id) =>
  User.findById(id)
    .select("-password")
    .populate("company", "name slug joinCode owner isActive");

const hasDeliverableEmailDomain = async (email) => {
  const domain = email.split("@")[1];

  if (!domain) {
    return false;
  }

  try {
    const records = await dns.resolveMx(domain);
    if (records.length) {
      return true;
    }
  } catch {
    // Some valid domains do not publish MX records, so try address records too.
  }

  try {
    const records = await dns.resolve4(domain);
    if (records.length) {
      return true;
    }
  } catch {
    // Try IPv6 before declaring the domain non-deliverable.
  }

  try {
    const records = await dns.resolve6(domain);
    return records.length > 0;
  } catch {
    return false;
  }
};

const readSmtpResponse = (socket) =>
  new Promise((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      socket.off("data", handleData);
      socket.off("error", reject);
    };

    const handleData = (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1] || "";

      if (/^\d{3}\s/.test(lastLine)) {
        cleanup();
        resolve(buffer);
      }
    };

    socket.on("data", handleData);
    socket.once("error", reject);
  });

const sendSmtpCommand = async (socket, command) => {
  socket.write(`${command}\r\n`);
  return readSmtpResponse(socket);
};

const verifyMailboxExists = async (email) => {
  const domain = email.split("@")[1];

  if (!domain) {
    return false;
  }

  let records = [];

  try {
    records = await dns.resolveMx(domain);
  } catch {
    return null;
  }

  const mxHost = records.sort((a, b) => a.priority - b.priority)[0]?.exchange;

  if (!mxHost) {
    return null;
  }

  return new Promise((resolve) => {
    const socket = net.createConnection(25, mxHost);
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(7000);
    socket.once("timeout", () => finish(null));
    socket.once("error", () => finish(null));

    socket.once("connect", async () => {
      try {
        await readSmtpResponse(socket);
        await sendSmtpCommand(socket, `HELO ${process.env.SMTP_HELO_DOMAIN || "esuchi.local"}`);
        await sendSmtpCommand(
          socket,
          `MAIL FROM:<${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@esuchi.local"}>`,
        );
        const response = await sendSmtpCommand(socket, `RCPT TO:<${email}>`);
        await sendSmtpCommand(socket, "QUIT").catch(() => null);

        if (/^25[0-9]/m.test(response)) {
          finish(true);
          return;
        }

        if (/^55[013]/m.test(response) || /user unknown|no such user|mailbox unavailable|recipient address rejected/i.test(response)) {
          finish(false);
          return;
        }

        finish(null);
      } catch {
        finish(null);
      }
    });
  });
};

const validateEmailCanReceiveOtp = async (email) => {
  const hasDeliverableDomain = await hasDeliverableEmailDomain(email);

  if (!hasDeliverableDomain) {
    return false;
  }

  const mailboxExists = await verifyMailboxExists(email);
  return mailboxExists === true;
};

const isNonExistentMailboxError = (error) => {
  const responseCode = Number(error?.responseCode);
  const message = `${error?.message || ""} ${error?.response || ""}`.toLowerCase();

  return (
    [550, 551, 553].includes(responseCode) ||
    message.includes("user unknown") ||
    message.includes("mailbox unavailable") ||
    message.includes("recipient address rejected") ||
    message.includes("no such user")
  );
};

//
// ================= SIGNUP OTP =================
//

// STEP 1: REQUEST OTP
exports.requestSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existing = await User.findOne({ email: email.trim() });

    // allow resend only if not verified
    if (existing && existing.isVerified) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 10);

    await User.findOneAndUpdate(
      { email: email.trim() },
      {
        email: email.trim(),
        signupOtpHash: otpHash,
        signupOtpExpires: new Date(Date.now() + OTP_EXPIRY_MS),
        isActive: false,
        isVerified: false,
      },
      { upsert: true, new: true },
    );

    await sendOtpEmail(email, otp, "signup verification");

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ message: "Unable to send signup OTP" });
  }
};

//
// STEP 2: VERIFY OTP + CREATE USER
//
exports.verifySignupOtp = async (req, res) => {
  try {
    const { email, otp, name, password, companyName, joinCode } = req.body;

    if (!email || !otp || !name || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (companyName && joinCode) {
      return res.status(400).json({
        message: "Choose either create company or join company, not both",
      });
    }

    const user = await User.findOne({ email: email.trim() });

    if (!user || !user.signupOtpHash || !user.signupOtpExpires) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (Date.now() > user.signupOtpExpires.getTime()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(otp, user.signupOtpHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const normalizedJoinCode = normalizeJoinCode(joinCode);
    let company = null;
    let role = "admin";
    let membershipStatus = "approved";

    if (normalizedJoinCode) {
      company = await Company.findOne({
        joinCode: normalizedJoinCode,
        isActive: true,
      });

      if (!company) {
        return res.status(404).json({ message: "Company join code is invalid" });
      }

      role = "staff";
      membershipStatus = "pending";
    }

    // finalize user
    user.name = name;
    user.password = password; // pre-save hook will hash it
    user.signupOtpHash = null;
    user.signupOtpExpires = null;
    user.isActive = true;
    user.isVerified = true;
    user.role = role;
    user.membershipStatus = membershipStatus;

    if (!company) {
      company = await createCompanyForUser(user, companyName || `${name}'s Company`);
    }

    user.company = company._id;

    await user.save();

    if (membershipStatus === "approved") {
      await migrateLegacyDataForUser(user._id, company._id);
    }

    const token = signToken(user._id, user.role);
    sendTokenCookie(res, token);

    const authUser = await reloadAuthUser(user._id);

    res.json({
      success: true,
      requiresApproval: membershipStatus !== "approved",
      user: serializeUser(authUser),
    });
  } catch (err) {
    res.status(500).json({ message: "Unable to verify signup OTP" });
  }
};

//
// ================= LOGIN =================
//
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ success: false, message: "Account is deactivated" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    await ensureUserCompany(user);
    user = await User.findById(user._id)
      .select("+password")
      .populate("company", "name slug joinCode owner isActive");

    if (user.company && user.company.isActive === false) {
      return res
        .status(403)
        .json({ success: false, message: "Company account is deactivated" });
    }

    const token = signToken(user._id, user.role);
    sendTokenCookie(res, token);

    res.json({
      success: true,
      requiresApproval: user.membershipStatus !== "approved",
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Unable to log in" });
  }
};

//
// ================= GET ME =================
//
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    requiresApproval: req.user.membershipStatus !== "approved",
    user: serializeUser(req.user),
  });
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ company: getCompanyId(req) })
      .select("name email role membershipStatus isActive isVerified createdAt updatedAt")
      .sort("-createdAt");

    res.json({
      success: true,
      count: users.length,
      data: users.map((user) => ({
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
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const role = req.body.role?.trim().toLowerCase();
    const allowedRoles = COMPANY_ROLES;

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be admin, manager, staff, or viewer",
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      company: getCompanyId(req),
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (String(user._id) === String(req.user._id) && role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own admin role",
      });
    }

    if (user.role === "admin" && role !== "admin") {
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

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: "User role updated",
      data: {
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
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//
// ================= UPDATE PROFILE =================
//
exports.requestEmailChangeOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email address" });
    }

    if (email === req.user.email) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a different email address" });
    }

    const canReceiveOtp = await validateEmailCanReceiveOtp(email);

    if (!canReceiveOtp) {
      return res
        .status(400)
        .json({ success: false, message: "Email address does not exist" });
    }

    const existingUser = await User.findOne({
      email,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already in use" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 10);

    try {
      await sendOtpEmail(email, otp, "email verification");
    } catch (error) {
      if (isNonExistentMailboxError(error)) {
        return res
          .status(400)
          .json({ success: false, message: "Email address does not exist" });
      }

      throw error;
    }

    user.pendingEmail = email;
    user.emailChangeOtpHash = otpHash;
    user.emailChangeOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    await user.save();

    res.json({
      success: true,
      message: "OTP sent to your new email address.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Unable to send email OTP" });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const emailOtp = req.body.emailOtp?.trim();

    if (!name || !email) {
      return res
        .status(400)
        .json({ success: false, message: "Name and email are required" });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email address" });
    }

    const existingUser = await User.findOne({
      email,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already in use" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const emailChanged = email !== user.email;

    if (emailChanged) {
      if (!emailOtp) {
        return res.status(400).json({
          success: false,
          message: "Enter the OTP sent to your new email address",
        });
      }

      if (
        user.pendingEmail !== email ||
        !user.emailChangeOtpHash ||
        !user.emailChangeOtpExpires
      ) {
        return res.status(400).json({
          success: false,
          message: "Request an OTP for this email before saving",
        });
      }

      if (Date.now() > user.emailChangeOtpExpires.getTime()) {
        user.pendingEmail = null;
        user.emailChangeOtpHash = null;
        user.emailChangeOtpExpires = null;
        await user.save();

        return res.status(400).json({
          success: false,
          message: "OTP expired. Request a new one.",
        });
      }

      const isOtpValid = await bcrypt.compare(emailOtp, user.emailChangeOtpHash);

      if (!isOtpValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }
    }

    user.name = name;
    user.email = email;
    user.pendingEmail = null;
    user.emailChangeOtpHash = null;
    user.emailChangeOtpExpires = null;
    await user.save();

    const authUser = await reloadAuthUser(user._id);

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: serializeUser(authUser),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Unable to update profile" });
  }
};

//
// ================= CHANGE PASSWORD =================
//
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All password fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!(await user.matchPassword(currentPassword))) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }

    if (newPassword === currentPassword || (await user.matchPassword(newPassword))) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "New passwords do not match" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Unable to change password" });
  }
};

//
// ================= LOGOUT =================
//
exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.json({ success: true, message: "Logged out successfully" });
};
