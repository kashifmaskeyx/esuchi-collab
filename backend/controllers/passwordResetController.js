const crypto = require("crypto");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const { sendPasswordResetOtp } = require("../config/mail");

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const PASSWORD_RESET_WINDOW_MS = 15 * 60 * 1000;

// ================= FORGOT PASSWORD — REQUEST OTP =================
exports.requestPasswordResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim() });
    if (!user) {
      return res.status(404).json({
        message: "No account found with this email.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "This account is not verified yet.",
      });
    }

    const otpPlain = String(crypto.randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otpPlain, 10);
    user.passwordResetOtpHash = otpHash;
    user.passwordResetOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.passwordResetAllowedUntil = null;
    await user.save();

    try {
      await sendPasswordResetOtp(user.email, otpPlain);
    } catch (err) {
      console.error("sendPasswordResetOtp failed:", err.message || err);
      user.passwordResetOtpHash = null;
      user.passwordResetOtpExpires = null;
      user.passwordResetAllowedUntil = null;
      await user.save();
      return res.status(500).json({
        message: "Could not send email. Try again later.",
      });
    }

    res.json({ message: "Password reset OTP sent to your email." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= VERIFY OTP (THEN SHOW NEW-PASSWORD SCREEN) =================
exports.verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email?.trim() || !otp?.trim()) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const user = await User.findOne({ email: email.trim() });
    if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpires) {
      return res.status(400).json({
        message:
          "Invalid or expired code. Request a new one from forgot password.",
      });
    }

    if (Date.now() > user.passwordResetOtpExpires.getTime()) {
      user.passwordResetOtpHash = null;
      user.passwordResetOtpExpires = null;
      user.passwordResetAllowedUntil = null;
      await user.save();
      return res.status(400).json({
        message: "Code has expired. Request a new one from forgot password.",
      });
    }

    const otpOk = await bcrypt.compare(
      String(otp).trim(),
      user.passwordResetOtpHash,
    );
    if (!otpOk) {
      return res.status(400).json({ message: "Invalid code" });
    }

    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpires = null;
    user.passwordResetAllowedUntil = new Date(
      Date.now() + PASSWORD_RESET_WINDOW_MS,
    );
    await user.save();

    res.json({
      message: "Code verified. You can set a new password.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= RESET PASSWORD (AFTER OTP VERIFIED ON PREVIOUS SCREEN) =================
exports.resetPasswordAfterOtpVerified = async (req, res) => {
  try {
    const { email, password } = req.body;
    const confirmPassword =
      req.body.confirmPassword ?? req.body.confirm_password;

    if (!email?.trim() || !password?.trim() || !confirmPassword?.trim()) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findOne({ email: email.trim() });
    if (!user || !user.passwordResetAllowedUntil) {
      return res.status(400).json({
        message:
          "Verify your code first, or your session expired. Start again from forgot password.",
      });
    }

    if (Date.now() > user.passwordResetAllowedUntil.getTime()) {
      user.passwordResetAllowedUntil = null;
      await user.save();
      return res.status(400).json({
        message:
          "Time to set a new password has expired. Verify your code again.",
      });
    }

    user.password = password;
    user.passwordResetAllowedUntil = null;
    await user.save();

    res.json({
      message:
        "Password reset successful. You can log in with your new password.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
