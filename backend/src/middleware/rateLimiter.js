/**
 * In-memory rate limiting middleware
 * Protects endpoints like login, register, and AI generation from abuse.
 */
export function rateLimiter({ windowMs = 60 * 1000, max = 30, message = 'Too many requests. Please try again later.' } = {}) {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'client';
    const now = Date.now();

    let entry = requests.get(key);
    if (!entry) {
      entry = { count: 1, resetTime: now + windowMs };
      requests.set(key, entry);
    } else if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + windowMs;
    } else {
      entry.count += 1;
    }

    // Clean up expired keys occasionally
    if (requests.size > 1000) {
      for (const [k, v] of requests.entries()) {
        if (now > v.resetTime) requests.delete(k);
      }
    }

    if (entry.count > max) {
      return res.status(429).json({ error: message, retryAfter: Math.ceil((entry.resetTime - now) / 1000) });
    }

    next();
  };
}
