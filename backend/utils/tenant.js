const getCompanyId = (req) => {
  const company = req.user?.company;
  return company?._id || company || null;
};

const requireCompanyId = (req) => {
  const companyId = getCompanyId(req);

  if (!companyId) {
    const error = new Error("Company membership is required");
    error.statusCode = 403;
    throw error;
  }

  return companyId;
};

const companyQuery = (req, query = {}) => ({
  ...query,
  company: requireCompanyId(req),
});

const actorFields = (req) => ({
  company: requireCompanyId(req),
  user: req.user._id,
});

const createdByFields = (req) => ({
  company: requireCompanyId(req),
  createdBy: req.user._id,
});

const isCompanyAdmin = (req) => req.user?.role === "admin";

module.exports = {
  actorFields,
  companyQuery,
  createdByFields,
  getCompanyId,
  isCompanyAdmin,
  requireCompanyId,
};
