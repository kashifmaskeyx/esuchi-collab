const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const {
  login,
  getMe,
  updateMe,
  requestEmailChangeOtp,
  changePassword,
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

//
// ================= SIGNUP (OTP FLOW) =================
//

// Step 1: Request OTP
router.post(
  "/signup-otp",
  [body("email").isEmail().withMessage("Valid email required")],
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
  verifySignupOtp,
);

//
// ================= LOGIN =================
//
router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  login,
);

//
// ================= AUTH USER =================
//
router.get("/me", protect, getMe);
router.post(
  "/me/email-otp",
  protect,
  [body("email").isEmail()],
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
router.post("/forgot-password", requestPasswordResetOtp);

router.post(
  "/verify-reset-otp",
  [body("email").isEmail(), body("otp").notEmpty()],
  verifyPasswordResetOtp,
);

router.post(
  "/reset-password",
  [
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("confirmPassword").notEmpty(),
  ],
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
