import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  checkRateLimit,
  checkAndIncrementQuota,
  RateLimitExceededError,
  QuotaExceededError,
} from '@/lib/rate-limit/redis';
import { redisClient } from '@/lib/queue/client';

describe('Redis Rate Limiting and Quotas', () => {
  beforeAll(async () => {
    // Clear redis keys related to tests
    const keys = await redisClient.keys('ratelimit:*');
    if (keys.length) await redisClient.del(keys);
    const quotaKeys = await redisClient.keys('quota:*');
    if (quotaKeys.length) await redisClient.del(quotaKeys);
  });

  afterAll(async () => {
    const keys = await redisClient.keys('ratelimit:*');
    if (keys.length) await redisClient.del(keys);
    const quotaKeys = await redisClient.keys('quota:*');
    if (quotaKeys.length) await redisClient.del(quotaKeys);
    // Ensure graceful shutdown of redis handles inside vitest
  });

  it('allows requests under the rate limit', async () => {
    const key = 'test-limit-1';
    const config = { limit: 2, windowSec: 10 };

    await expect(checkRateLimit(key, config)).resolves.not.toThrow();
    await expect(checkRateLimit(key, config)).resolves.not.toThrow();
  });

  it('rejects requests over the rate limit', async () => {
    const key = 'test-limit-2';
    const config = { limit: 2, windowSec: 10 };

    await checkRateLimit(key, config);
    await checkRateLimit(key, config);

    await expect(checkRateLimit(key, config)).rejects.toThrow(RateLimitExceededError);
  });

  it('allows operations within the monthly quota', async () => {
    const tenantId = 'tenant-a';
    await expect(checkAndIncrementQuota(tenantId, 'ai_analysis', 100)).resolves.not.toThrow();
    await expect(checkAndIncrementQuota(tenantId, 'ai_analysis', 200)).resolves.not.toThrow();
  });

  it('rejects operations exceeding the monthly quota', async () => {
    const tenantId = 'tenant-b';
    // AI analysis limit is hardcoded to 500 for tests
    await expect(checkAndIncrementQuota(tenantId, 'ai_analysis', 450)).resolves.not.toThrow();
    await expect(checkAndIncrementQuota(tenantId, 'ai_analysis', 100)).rejects.toThrow(
      QuotaExceededError
    );
  });

  it('maintains strict tenant isolation for quotas', async () => {
    const tenantC = 'tenant-c';
    const tenantD = 'tenant-d';

    // Max out tenant C
    await checkAndIncrementQuota(tenantC, 'sms_send', 1000);
    await expect(checkAndIncrementQuota(tenantC, 'sms_send', 1)).rejects.toThrow(
      QuotaExceededError
    );

    // Tenant D should still have their full quota available
    await expect(checkAndIncrementQuota(tenantD, 'sms_send', 10)).resolves.not.toThrow();
  });
});
