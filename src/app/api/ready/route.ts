import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redisClient } from '@/lib/queue/client';

export async function GET() {
  try {
    // 1. Verify PostgreSQL
    await prisma.$queryRaw`SELECT 1`;

    // 2. Verify Redis
    const redisPing = await redisClient.ping();
    if (redisPing !== 'PONG') {
      throw new Error('Redis did not respond with PONG');
    }

    return NextResponse.json({
      status: 'ready',
      dependencies: {
        database: 'ok',
        redis: 'ok',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Readiness Check Failed]:', error);
    return NextResponse.json(
      {
        status: 'not_ready',
        dependencies: {
          database: 'error',
          redis: 'error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
