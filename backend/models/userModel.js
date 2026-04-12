const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      minlength: 6,
      select: false,
    },

    role: { type: String, enum: ["admin", "user"], default: "user" },
    isActive: { type: Boolean, default: true },

    passwordResetOtpHash: {
      type: String,
      default: null,
    },
    passwordResetOtpExpires: {
      type: Date,
      default: null,
    },
    passwordResetAllowedUntil: {
      type: Date,
      default: null,
    },
    signupOtpHash: {
      type: String,
      default: null,
    },
    signupOtpExpires: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Hash password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
