const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const {
  login,
  getMe,
  logout,
  requestSignupOtp,
  verifySignupOtp,
} = require("../controllers/authController");

const {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordAfterOtpVerified,
} = require("../controllers/passwordResetController");

const { protect } = require("../middlewares/authMiddleware");

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

module.exports = router;
