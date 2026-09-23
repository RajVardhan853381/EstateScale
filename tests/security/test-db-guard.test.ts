import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { assertSafeTestDatabase } from '../test-db-guard';

describe('Test Database Safety Guard', () => {
  const originalDbUrl = process.env.DATABASE_URL;
  const originalAllowRemote = process.env.ALLOW_REMOTE_TEST_DB;

  beforeEach(() => {
    delete process.env.ALLOW_REMOTE_TEST_DB;
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDbUrl;
    if (originalAllowRemote !== undefined) {
      process.env.ALLOW_REMOTE_TEST_DB = originalAllowRemote;
    } else {
      delete process.env.ALLOW_REMOTE_TEST_DB;
    }
  });

  it('should allow execution against localhost databases', () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/estatescale';
    expect(() => assertSafeTestDatabase()).not.toThrow();
  });

  it('should allow execution against 127.0.0.1 databases', () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5434/estatescale_dev';
    expect(() => assertSafeTestDatabase()).not.toThrow();
  });

  it('should allow execution against explicitly named test databases', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db-host:5432/estatescale_test?sslmode=require';
    expect(() => assertSafeTestDatabase()).not.toThrow();
  });

  it('should reject execution when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => assertSafeTestDatabase()).toThrowError(/DATABASE_URL is not set/);
  });

  it('should reject execution against remote Neon production/staging databases', () => {
    process.env.DATABASE_URL =
      'postgresql://neondb_owner:npg_secret@ep-wispy-cell.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';
    expect(() => assertSafeTestDatabase()).toThrowError(/CRITICAL DATABASE SAFETY VIOLATION/);
  });

  it('should reject execution against AWS RDS production databases', () => {
    process.env.DATABASE_URL =
      'postgresql://admin:password@prod-estate.rds.amazonaws.com:5432/production';
    expect(() => assertSafeTestDatabase()).toThrowError(/CRITICAL DATABASE SAFETY VIOLATION/);
  });

  it('should honor explicit ALLOW_REMOTE_TEST_DB override for containerized CI pipelines', () => {
    process.env.DATABASE_URL =
      'postgresql://ci_runner:token@ci-internal-postgres.internal:5432/ephemeral';
    process.env.ALLOW_REMOTE_TEST_DB = 'true';
    expect(() => assertSafeTestDatabase()).not.toThrow();
  });
});
