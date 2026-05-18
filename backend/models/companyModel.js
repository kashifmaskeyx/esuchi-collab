const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const normalizeSlug = (value) =>
  String(value || "company")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "company";

const generateJoinCode = () =>
  randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    joinCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

companySchema.pre("validate", function () {
  if (!this.slug) {
    this.slug = `${normalizeSlug(this.name)}-${generateJoinCode().toLowerCase()}`;
  }

  if (!this.joinCode) {
    this.joinCode = generateJoinCode();
  }
});

module.exports = mongoose.model("Company", companySchema);
