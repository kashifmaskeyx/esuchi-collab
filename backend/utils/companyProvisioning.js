const Company = require("../models/companyModel");
const Product = require("../models/productModel");
const Inventory = require("../models/inventoryModel");
const Supplier = require("../models/supplierModel");
const Order = require("../models/orderModel");
const StockMovement = require("../models/stockMovementModel");
const Shipment = require("../models/shipmentModel");
const Return = require("../models/returnModel");
const AuditLog = require("../models/auditlogModel");
const Staff = require("../models/staffModel");

const missingCompanyQuery = {
  $or: [{ company: { $exists: false } }, { company: null }],
};

const fallbackCompanyName = (user) => {
  const label = user.name || user.email?.split("@")[0] || "My";
  return `${label}'s Company`;
};

const createCompanyForUser = async (user, companyName) =>
  Company.create({
    name: companyName?.trim() || fallbackCompanyName(user),
    owner: user._id,
  });

const migrateLegacyDataForUser = async (userId, companyId) => {
  await Promise.all([
    Product.updateMany(
      { user: userId, ...missingCompanyQuery },
      { $set: { company: companyId } },
    ),
    Inventory.updateMany(
      { user: userId, ...missingCompanyQuery },
      { $set: { company: companyId } },
    ),
    Supplier.updateMany(
      { user: userId, ...missingCompanyQuery },
      { $set: { company: companyId } },
    ),
    Order.updateMany(
      { user: userId, ...missingCompanyQuery },
      { $set: { company: companyId } },
    ),
    StockMovement.updateMany(
      { user: userId, ...missingCompanyQuery },
      { $set: { company: companyId } },
    ),
    Return.updateMany(
      { user: userId, ...missingCompanyQuery },
      { $set: { company: companyId } },
    ),
    Shipment.updateMany(
      { createdBy: userId, ...missingCompanyQuery },
      { $set: { company: companyId } },
    ),
    AuditLog.updateMany(
      { userId, ...missingCompanyQuery },
      { $set: { company: companyId } },
    ),
    Staff.updateMany(
      { owner: userId, ...missingCompanyQuery },
      { $set: { company: companyId } },
    ),
  ]);
};

const ensureUserCompany = async (user) => {
  if (user.company) {
    return user;
  }

  const company = await createCompanyForUser(user);
  user.company = company._id;
  user.role = "admin";
  user.membershipStatus = "approved";
  await user.save();
  await migrateLegacyDataForUser(user._id, company._id);

  return user;
};

module.exports = {
  createCompanyForUser,
  ensureUserCompany,
  migrateLegacyDataForUser,
};
