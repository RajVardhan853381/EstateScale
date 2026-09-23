/**
 * Test Database Safety Guard
 * 
 * Prevents catastrophic data-loss by strictly verifying that any destructive
 * database operations (e.g. prisma.organization.deleteMany()) can ONLY execute
 * against an explicitly verified local or dedicated test database.
 */
export function assertSafeTestDatabase(): void {
  const dbUrl = process.env.DATABASE_URL || '';

  // Explicit override flag for containerized CI test environments if needed
  if (process.env.ALLOW_REMOTE_TEST_DB === 'true') {
    return;
  }

  if (!dbUrl) {
    throw new Error(
      'CRITICAL DATABASE SAFETY VIOLATION: DATABASE_URL is not set. Refusing to run destructive tests.'
    );
  }

  // Permitted safe test database patterns: localhost, 127.0.0.1, or database name containing 'test'
  const isLocalHost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  const isTestDbName = /[\/:@]([^\/?#]*test[^\/?#]*)(\?|$)/i.test(dbUrl);

  // Explicitly prohibited: live production/staging hosts unless overridden
  const isNeonRemote = dbUrl.includes('neon.tech') && !isTestDbName;
  const isAwsRemote = (dbUrl.includes('.aws.') || dbUrl.includes('rds.amazonaws.com')) && !isTestDbName;

  if (isNeonRemote || isAwsRemote || (!isLocalHost && !isTestDbName)) {
    throw new Error(
      `CRITICAL DATABASE SAFETY VIOLATION: Attempted to run database-wiping test against non-test database: "${dbUrl.replace(
        /:[^:@]+@/,
        ':***@'
      )}". Destructive tests are prohibited against remote, staging, or production environments.`
    );
  }
}
