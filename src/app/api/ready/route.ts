import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redisClient } from '@/lib/queue/client';

export async function GET() {
  try {
    const dbPromise = prisma.$queryRaw`SELECT 1`.catch(() => {
      throw new Error('DB Error');
    });
    const redisPromise = redisClient.ping().catch(() => {
      throw new Error('Redis Error');
    });

    const results = await Promise.allSettled([
      Promise.race([
        dbPromise,
        new Promise((_, r) => setTimeout(() => r(new Error('DB Timeout')), 5000)),
      ]),
      Promise.race([
        redisPromise,
        new Promise((_, r) => setTimeout(() => r(new Error('Redis Timeout')), 5000)),
      ]),
    ]);

    const dbStatus = results[0].status === 'fulfilled' ? 'UP' : 'DOWN';
    const redisStatus = results[1].status === 'fulfilled' ? 'UP' : 'DOWN';

    if (dbStatus === 'DOWN') {
      return NextResponse.json(
        {
          status: 'DOWN',
          db: dbStatus,
          redis: redisStatus,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'UP',
      db: dbStatus,
      redis: redisStatus,
    });
  } catch {
    return NextResponse.json({ status: 'DOWN' }, { status: 503 });
  }
}
