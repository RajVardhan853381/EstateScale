import { NextResponse } from 'next/server';
import { processScheduledJourneySteps } from '@/lib/journeys/worker';
import { resetMonthlyAiQuotas } from '@/lib/ai/guard';
import crypto from 'node:crypto';

export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, CRON_SECRET is strictly required
  if (isProduction && !cronSecret) {
    console.error('[Cron:Journeys Error]: CRON_SECRET is not configured in production');
    return NextResponse.json(
      { error: 'Cron authorization is not configured' },
      { status: 500 }
    );
  }

  // Enforce Bearer token authorization with timing-safe comparison
  if (cronSecret) {
    const authHeader = req.headers.get('authorization') || '';
    const expectedHeader = `Bearer ${cronSecret}`;
    const authBuffer = Buffer.from(authHeader);
    const expectedBuffer = Buffer.from(expectedHeader);

    if (
      authBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(authBuffer, expectedBuffer)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // 1. Maintain tenant AI quotas (reset monthly spend if new month started)
    const quotasReset = await resetMonthlyAiQuotas();

    // 2. Process scheduled journey steps and recover stale executions
    const result = await processScheduledJourneySteps();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      quotasReset,
      ...result,
    });
  } catch (error: unknown) {
    console.error('[Cron:Journeys Error]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
