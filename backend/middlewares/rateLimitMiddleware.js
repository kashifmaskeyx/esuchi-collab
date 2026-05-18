const createRateLimiter = ({
  windowMs,
  maxRequests,
  message,
}) => {
  const requestStore = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const windowStart = now - windowMs;

    const existing = requestStore.get(ip) || [];
    const recentRequests = existing.filter((timestamp) => timestamp > windowStart);
    recentRequests.push(now);
    requestStore.set(ip, recentRequests);

    if (recentRequests.length > maxRequests) {
      const retryAfterSeconds = Math.ceil((recentRequests[0] + windowMs - now) / 1000);
      res.setHeader("Retry-After", Math.max(retryAfterSeconds, 1));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    return next();
  };
};

const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: "Too many login/reset attempts. Please try again later.",
});

const otpRequestRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 5,
  message: "Too many OTP requests. Please wait before trying again.",
});

const otpVerifyRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  message: "Too many OTP verification attempts. Please try again later.",
});

module.exports = {
  authRateLimit,
  otpRequestRateLimit,
  otpVerifyRateLimit,
};
