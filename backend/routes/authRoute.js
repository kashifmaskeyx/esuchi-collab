const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const {
  login,
  getMe,
  updateMe,
  requestEmailChangeOtp,
  changePassword,
  getUsers,
  updateUserRole,
  logout,
  requestSignupOtp,
  verifySignupOtp,
} = require("../controllers/authController");

const {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordAfterOtpVerified,
  adminResetUserPassword,
} = require("../controllers/passwordResetController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  authRateLimit,
  otpRequestRateLimit,
  otpVerifyRateLimit,
} = require("../middlewares/rateLimitMiddleware");

//
// ================= SIGNUP (OTP FLOW) =================
//

// Step 1: Request OTP
router.post(
  "/signup-otp",
  [body("email").isEmail().withMessage("Valid email required")],
  otpRequestRateLimit,
  requestSignupOtp,
);

// Step 2: Verify OTP + create account
router.post(
  "/verify-signup-otp",
  [
    body("email").isEmail(),
    body("otp").notEmpty(),
    body("name").notEmpty(),
    body("password").isLength({ min: 6 }),
  ],
  otpVerifyRateLimit,
  verifySignupOtp,
);

//
// ================= LOGIN =================
//
router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  authRateLimit,
  login,
);

//
// ================= AUTH USER =================
//
router.get("/users", protect, adminOnly, getUsers);
router.patch("/users/:id/role", protect, adminOnly, updateUserRole);
router.get("/me", protect, getMe);
router.post(
  "/me/email-otp",
  protect,
  [body("email").isEmail()],
  otpRequestRateLimit,
  requestEmailChangeOtp,
);
router.put(
  "/me",
  protect,
  [body("name").notEmpty(), body("email").isEmail()],
  updateMe,
);
router.put(
  "/password",
  protect,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 6 }),
    body("confirmPassword").notEmpty(),
  ],
  changePassword,
);
router.post("/logout", protect, logout);

//
// ================= FORGOT PASSWORD =================
//
router.post("/forgot-password", otpRequestRateLimit, requestPasswordResetOtp);

router.post(
  "/verify-reset-otp",
  [body("email").isEmail(), body("otp").notEmpty()],
  otpVerifyRateLimit,
  verifyPasswordResetOtp,
);

router.post(
  "/reset-password",
  [
    body("email").isEmail(),
    body("resetToken").notEmpty(),
    body("password").isLength({ min: 6 }),
    body("confirmPassword").notEmpty(),
  ],
  authRateLimit,
  resetPasswordAfterOtpVerified,
);

//
// ================= ADMIN RESET USER PASSWORD =================
//
router.post(
  "/admin/reset-user-password",
  protect,
  adminOnly,
  adminResetUserPassword,
);

module.exports = router;