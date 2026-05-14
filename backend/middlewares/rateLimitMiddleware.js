const buckets = new Map();

const defaultKeyGenerator = (req) => `${req.ip}:${req.originalUrl}`;

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 30,
  keyGenerator = defaultKeyGenerator,
  message = "Too many requests. Please try again later.",
} = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ success: false, message });
    }

    existing.count += 1;
    return next();
  };
};

const emailKey = (req) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  return `${req.ip}:${req.path}:${email || "no-email"}`;
};

exports.authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

exports.otpRequestRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: emailKey,
  message: "Too many code requests. Please wait before trying again.",
});

exports.otpVerifyRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyGenerator: emailKey,
  message: "Too many verification attempts. Please wait before trying again.",
});
