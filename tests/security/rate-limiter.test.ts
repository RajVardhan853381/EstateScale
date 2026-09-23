import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimiter } from '../../src/lib/security/rate-limiter';

describe('InMemoryRateLimiter', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within limit', () => {
    const key = `test-user-${Date.now()}`;
    const res1 = rateLimiter.check(key, 3, 1000);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = rateLimiter.check(key, 3, 1000);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = rateLimiter.check(key, 3, 1000);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it('should reject requests exceeding limit', () => {
    const key = `test-user-exceed-${Date.now()}`;
    rateLimiter.check(key, 2, 1000);
    rateLimiter.check(key, 2, 1000);

    const res3 = rateLimiter.check(key, 2, 1000);
    expect(res3.success).toBe(false);
    expect(res3.remaining).toBe(0);
    expect(res3.resetInMs).toBeGreaterThan(0);
  });

  it('should isolate limits across different keys', () => {
    const key1 = `test-user-a-${Date.now()}`;
    const key2 = `test-user-b-${Date.now()}`;

    rateLimiter.check(key1, 1, 1000);
    const key1Over = rateLimiter.check(key1, 1, 1000);
    expect(key1Over.success).toBe(false);

    const key2First = rateLimiter.check(key2, 1, 1000);
    expect(key2First.success).toBe(true);
  });

  it('should enforce login rate limit (5 attempts per minute, 6th rejected)', () => {
    const emailKey = `login:victim-${Date.now()}@estatescale.com`;

    for (let i = 1; i <= 5; i++) {
      const res = rateLimiter.check(emailKey, 5, 60000);
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(5 - i);
    }

    const sixthAttempt = rateLimiter.check(emailKey, 5, 60000);
    expect(sixthAttempt.success).toBe(false);
    expect(sixthAttempt.remaining).toBe(0);
    expect(sixthAttempt.resetInMs).toBeGreaterThan(0);

    // Reset upon successful authentication clears the lock
    rateLimiter.reset(emailKey);
    const afterReset = rateLimiter.check(emailKey, 5, 60000);
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(4);
  });
});
