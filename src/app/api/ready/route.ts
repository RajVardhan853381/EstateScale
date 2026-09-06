import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbOk = false;
  let redisOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (err) {
    logger.error({ err, operation: 'readiness_db_check' }, 'Readiness check failed: Database unavailable');
  }

  let redisClient: Redis | null = null;
  try {
    if (process.env.REDIS_URL) {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 0,
        connectTimeout: 2000,
        commandTimeout: 2000,
      });
      await redisClient.ping();
      redisOk = true;
    } else {
      redisOk = true;
    }
  } catch (err) {
    logger.error({ err, operation: 'readiness_redis_check' }, 'Readiness check failed: Redis unavailable');
  } finally {
    if (redisClient) {
      redisClient.quit().catch(() => {});
    }
  }

  const isReady = dbOk && redisOk;

  return NextResponse.json(
    {
      status: isReady ? 'ok' : 'error',
      dependencies: {
        database: dbOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down'
      }
    },
    { status: isReady ? 200 : 503 }
  );
}
