const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const { sendPasswordResetOtp } = require("../config/mail");

// ================= TOKEN =================
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

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

    await sendPasswordResetOtp(email, otp);

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//
// ================= GET ME =================
//
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

//
// ================= LOGOUT =================
//
exports.logout = (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};
