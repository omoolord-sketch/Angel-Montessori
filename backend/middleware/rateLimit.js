function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, keyPrefix = "global", message = "Too many requests", keyGenerator, skip } = {}) {
  const hits = new Map();

  const cleanupInterval = Math.max(60 * 1000, Math.floor(windowMs / 2));
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, cleanupInterval).unref?.();

  return (req, res, next) => {
    if (typeof skip === "function" && skip(req)) return next();

    const now = Date.now();
    const identity = typeof keyGenerator === "function"
      ? String(keyGenerator(req) || "")
      : String(req.ip || req.headers["x-forwarded-for"] || "unknown");

    const bucketKey = `${keyPrefix}:${identity}`;
    const existing = hits.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      hits.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message });
    }

    existing.count += 1;
    hits.set(bucketKey, existing);
    return next();
  };
}

module.exports = { createRateLimiter };
