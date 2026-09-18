import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisOptions = {
    maxRetriesPerRequest: null,
};

// Singleton pattern to prevent excessive connection creation in dev mode
const globalForRedis = global as unknown as { redisClient: Redis };

export const redisClient = globalForRedis.redisClient || new Redis(REDIS_URL, redisOptions);

if (process.env.NODE_ENV !== "production") {
    globalForRedis.redisClient = redisClient;
}

export default redisClient;
