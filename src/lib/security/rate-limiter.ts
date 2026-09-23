type RateLimitEntry = {
  timestamps: number[];
};

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically prune stale keys every 60s
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.prune(), 60000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Check and increment rate limit for an identifier
   * @param key Unique identifier (IP, orgId, userId)
   * @param maxRequests Maximum requests allowed within windowMs
   * @param windowMs Time window in milliseconds
   */
  check(key: string, maxRequests: number, windowMs: number): {
    success: boolean;
    remaining: number;
    resetInMs: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Filter out timestamps outside window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= maxRequests) {
      const oldest = entry.timestamps[0];
      const resetInMs = Math.max(0, oldest + windowMs - now);
      return {
        success: false,
        remaining: 0,
        resetInMs,
      };
    }

    entry.timestamps.push(now);
    return {
      success: true,
      remaining: maxRequests - entry.timestamps.length,
      resetInMs: windowMs,
    };
  }

  /**
   * Reset rate limit entries for a key (e.g. upon successful authentication)
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  private prune() {
    const now = Date.now();
    const maxWindow = 3600000; // 1 hour max retention
    for (const [key, entry] of this.store.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > now - maxWindow);
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

// Global singleton
const globalForLimiter = globalThis as unknown as { rateLimiter?: InMemoryRateLimiter };
export const rateLimiter = globalForLimiter.rateLimiter || new InMemoryRateLimiter();
if (process.env.NODE_ENV !== 'production') {
  globalForLimiter.rateLimiter = rateLimiter;
}
