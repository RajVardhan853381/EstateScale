import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisOptions = {
    maxRetriesPerRequest: null,
    // Add retry strategy for resiliency against temporary unavailability
    retryStrategy(times: number) {
        if (times > 10) {
            // Fail fast after 10 attempts to prevent hanging process completely
            return null;
        }
        return Math.min(times * 200, 2000);
    }
};

const globalForRedis = global as unknown as { redisClient: Redis };

export const redisClient = globalForRedis.redisClient || new Redis(REDIS_URL, redisOptions);

if (process.env.NODE_ENV !== "production") {
    globalForRedis.redisClient = redisClient;
}

export default redisClient;
