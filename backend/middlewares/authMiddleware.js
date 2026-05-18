const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { ensureUserCompany } = require('../utils/companyProvisioning');
 
exports.protect = async (req, res, next) => {
  let token;
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = await User.findById(decoded.id)
      .select('-password')
      .populate('company', 'name slug joinCode owner isActive');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email first' });
    }

    if (!user.company) {
      await ensureUserCompany(user);
      user = await User.findById(decoded.id)
        .select('-password')
        .populate('company', 'name slug joinCode owner isActive');
    }

    if (user.company && user.company.isActive === false) {
      return res.status(403).json({ success: false, message: 'Company account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

exports.requireApprovedCompany = (req, res, next) => {
  if (!req.user?.company) {
    return res.status(403).json({ success: false, message: 'Company membership is required' });
  }

  if (req.user.membershipStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Your company membership is waiting for admin approval',
      membershipStatus: req.user.membershipStatus,
    });
  }

  return next();
};
 
exports.adminOnly = (req, res, next) => {
  if (
    req.user?.company &&
    req.user.membershipStatus === 'approved' &&
    req.user.role === 'admin'
  ) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Company admin access only' });
};

exports.companyAdminOnly = exports.adminOnly;