import { describe, it, expect } from 'vitest';
import { validateEnv } from '../../src/lib/validations/env';

describe('Environment Variable Validation', () => {
  it('should reject production startup if DIRECT_URL is missing', () => {
    const invalidProdEnv = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://user:pass@ep-pooler.neon.tech/neondb',
      NEXTAUTH_SECRET: 'super-secret-key-at-least-16-chars',
      NEXTAUTH_URL: 'https://app.estatescale.com',
      CRON_SECRET: 'valid-cron-secret-1234',
    };

    expect(() => validateEnv(invalidProdEnv)).toThrowError(
      /DIRECT_URL is required in production/
    );
  });

  it('should reject production startup if CRON_SECRET is missing or short', () => {
    const invalidProdEnv = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://user:pass@ep-pooler.neon.tech/neondb',
      DIRECT_URL: 'postgres://user:pass@ep.neon.tech/neondb',
      NEXTAUTH_SECRET: 'super-secret-key-at-least-16-chars',
      NEXTAUTH_URL: 'https://app.estatescale.com',
      CRON_SECRET: 'short',
    };

    expect(() => validateEnv(invalidProdEnv)).toThrowError(
      /CRON_SECRET is required in production and must be at least 8 characters/
    );
  });

  it('should reject production startup if GEMINI_API_KEY is missing', () => {
    const invalidProdEnv = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://user:pass@ep-pooler.neon.tech/neondb',
      DIRECT_URL: 'postgres://user:pass@ep.neon.tech/neondb',
      NEXTAUTH_SECRET: 'super-secret-key-at-least-16-chars',
      NEXTAUTH_URL: 'https://app.estatescale.com',
      CRON_SECRET: 'valid-cron-secret-1234',
    };

    expect(() => validateEnv(invalidProdEnv)).toThrowError(
      /GEMINI_API_KEY is required in production/
    );
  });

  it('should accept valid production configuration', () => {
    const validProdEnv = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://user:pass@ep-pooler.neon.tech/neondb',
      DIRECT_URL: 'postgres://user:pass@ep.neon.tech/neondb',
      NEXTAUTH_SECRET: 'super-secret-key-at-least-16-chars',
      NEXTAUTH_URL: 'https://app.estatescale.com',
      CRON_SECRET: 'valid-cron-secret-1234',
      GEMINI_API_KEY: 'valid-gemini-api-key',
    };

    const parsed = validateEnv(validProdEnv);
    expect(parsed.DATABASE_URL).toBe(validProdEnv.DATABASE_URL);
    expect(parsed.DIRECT_URL).toBe(validProdEnv.DIRECT_URL);
    expect(parsed.GEMINI_API_KEY).toBe(validProdEnv.GEMINI_API_KEY);
  });
});
