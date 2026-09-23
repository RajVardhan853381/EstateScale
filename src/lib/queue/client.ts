import Redis from 'ioredis';

export const isRedisConfigured = Boolean(
  process.env.REDIS_URL && process.env.REDIS_URL.trim() !== ''
);

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisOptions = {
  maxRetriesPerRequest: null,
  lazyConnect: !isRedisConfigured,
  enableOfflineQueue: isRedisConfigured,
  retryStrategy(times: number) {
    if (!isRedisConfigured || times > 3) {
      return null; // Stop retrying immediately if Redis is not configured
    }
    return Math.min(times * 200, 2000);
  },
};

const globalForRedis = global as unknown as { redisClient: Redis };

export const redisClient =
  globalForRedis.redisClient || new Redis(REDIS_URL, redisOptions);

// Suppress unhandled error events when Redis is not running
redisClient.on('error', (err) => {
  if (!isRedisConfigured) {
    // Expected when running without Redis in 20-user mode
    return;
  }
  console.warn('[Redis] Connection warning:', err.message);
});

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redisClient;
}

export default redisClient;
