const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const { sendOtpEmail } = require("../config/mail");

// ================= TOKEN =================
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
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
    const { email, otp, name, password } = req.body;

    if (!email || !otp || !name || !password) {
      return res.status(400).json({ message: "All fields are required" });
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

    // finalize user
    user.name = name;
    user.password = password; // pre-save hook will hash it
    user.signupOtpHash = null;
    user.signupOtpExpires = null;
    user.isActive = true;
    user.isVerified = true;

    await user.save();

    const token = signToken(user._id);
    sendTokenCookie(res, token);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
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

    const user = await User.findOne({ email }).select("+password");

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

    const token = signToken(user._id);
    sendTokenCookie(res, token);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Unable to log in" });
  }
};

//
// ================= GET ME =================
//
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
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

    if (email === req.user.email) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a different email address" });
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
    user.pendingEmail = email;
    user.emailChangeOtpHash = await bcrypt.hash(otp, 10);
    user.emailChangeOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    await user.save();

    await sendOtpEmail(email, otp, "email verification");

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

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
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

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "New passwords do not match" });
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
