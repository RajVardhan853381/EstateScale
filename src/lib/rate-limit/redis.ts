import { metrics } from '../logger/metrics';
import { redisClient } from '@/lib/queue/client';

export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

interface RateLimitConfig {
  limit: number;
  windowSec: number;
}

// Basic fixed window rate limit implementation using Redis
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<void> {
  const redisKey = `ratelimit:${key}`;

  // We increment the count
  const currentCount = await redisClient.incr(redisKey);

  // If it's the first hit, set the expiration window
  if (currentCount === 1) {
    await redisClient.expire(redisKey, config.windowSec);
  }

  if (currentCount > config.limit) {
    throw new RateLimitExceededError(`Rate limit exceeded for ${key}`);
  }
}

// Basic monthly quota implementation using Redis
export async function checkAndIncrementQuota(
  tenantId: string,
  resource: 'ai_analysis' | 'sms_send',
  incrementBy = 1
): Promise<void> {
  const monthYear = new Date().toISOString().slice(0, 7); // e.g., "2024-05"
  const redisKey = `quota:${tenantId}:${resource}:${monthYear}`;

  // Get current usage (0 if doesn't exist)
  const currentStr = await redisClient.get(redisKey);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  // Hardcoded safety limits for Phase 6A to prevent runaway bills.
  // In the future, this would be fetched from `prisma.organization.aiTokenQuota` etc.
  const QUOTAS = {
    ai_analysis: 500, // Max 500 AI calls per month per tenant
    sms_send: 1000, // Max 1000 SMS sends per month per tenant
  };

  const limit = QUOTAS[resource];

  if (current + incrementBy > limit) {
    throw new QuotaExceededError(`Tenant quota exceeded for ${resource}`);
  }

  const newTotal = await redisClient.incrby(redisKey, incrementBy);

  // Set an expiration just to keep Redis clean (2 months)
  if (newTotal === incrementBy) {
    await redisClient.expire(redisKey, 60 * 60 * 24 * 60);
  }
}
