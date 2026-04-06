const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
  register,
  login,
  getMe,
  logout,
} = require("../controllers/authController");
const {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordAfterOtpVerified,
} = require("../controllers/passwordResetController");
const { protect } = require("../middlewares/authMiddleware");

router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  register,
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login,
);

router.get("/me", protect, getMe);
router.post("/logout", protect, logout);
router.post("/forgot-password", requestPasswordResetOtp);
router.post("/verify-reset-otp", verifyPasswordResetOtp);
router.post("/reset-password", resetPasswordAfterOtpVerified);

module.exports = router;
