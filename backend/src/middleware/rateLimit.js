const { rateLimit } = require('../config/upload.config');
const createError = require('http-errors');
const crypto = require('crypto');

class RateLimitMiddleware {
  constructor() {
    this.memoryStore = new Map();
    this.lastCleanup = Date.now();
  }

  getRateLimitKey(ip, size = 0) {
    const hash = crypto.createHash('sha256')
      .update(ip)
      .digest('hex');
    return `ratelimit:${hash}:${Math.floor(Date.now() / rateLimit.windowMs)}:${size}`;
  }

  setRateLimitHeaders(res, remaining, reset) {
    res.set({
      'X-RateLimit-Limit': rateLimit.maxRequests,
      'X-RateLimit-Remaining': Math.max(0, remaining),
      'X-RateLimit-Reset': reset,
      'Retry-After': Math.ceil((reset - Date.now()) / 1000),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });
  }

  handle() {
    return async (req, res, next) => {
      try {
        const requestSize = parseInt(req.headers['content-length'] || 0);
        
        if (requestSize > rateLimit.maxRequestSize) {
          throw createError(413, 'Request entity too large');
        }

        await this.handleMemoryFallback(req, res, requestSize);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  async handleMemoryFallback(req, res, size) {
    const now = Date.now();
    const windowStart = now - rateLimit.windowMs;
    const ip = req.ip;

    // Clean up old entries
    if (now - this.lastCleanup > rateLimit.windowMs) {
      for (const [key, data] of this.memoryStore) {
        if (data.timestamp < windowStart) {
          this.memoryStore.delete(key);
        }
      }
      this.lastCleanup = now;
    }

    // Get all requests for this IP in the current window
    const requests = Array.from(this.memoryStore.values())
      .filter(data => 
        data.ip === ip && 
        data.timestamp > windowStart && 
        data.timestamp <= now
      );

    const count = requests.length;
    const totalSize = requests.reduce((sum, req) => sum + req.size, 0) + size;

    const reset = new Date(Math.ceil(now / rateLimit.windowMs) * rateLimit.windowMs);
    this.setRateLimitHeaders(res, rateLimit.maxRequests - count, reset);

    if (count >= rateLimit.maxRequests || totalSize > rateLimit.maxDataSize) {
      throw createError(429, 'Rate limit exceeded. Please try again later.');
    }

    // Add current request
    const key = `${ip}:${now}`;
    this.memoryStore.set(key, {
      ip,
      timestamp: now,
      size
    });
  }
}

module.exports = new RateLimitMiddleware();