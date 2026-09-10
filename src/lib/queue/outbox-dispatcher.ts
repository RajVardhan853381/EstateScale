import { prisma } from '../prisma';
import { enqueueAutomationJob, AutomationJobPayload } from './producer';
import logger from '../logger';
import { incrementMetric } from '../metrics';
import { v4 as uuidv4 } from 'uuid';

/**
 * Dispatcher is responsible for safely claiming PENDING OutboxEvents via
 * FOR UPDATE SKIP LOCKED to ensure atomic delivery across concurrent workers.
 */
export async function dispatchOutboxEvents(batchSize: number = 50) {
  const sweepId = uuidv4();
  const log = logger.child({ module: 'outbox-dispatcher', sweepId });

  try {
    const claimedEvents: { id: string }[] = await prisma.$queryRaw`
            UPDATE "OutboxEvent"
            SET status = 'PROCESSING', "updatedAt" = NOW()
            WHERE id IN (
                SELECT id
                FROM "OutboxEvent"
                WHERE status IN ('PENDING', 'FAILED')
                  AND "availableAt" <= NOW()
                  AND attempts < 5
                ORDER BY "createdAt" ASC
                LIMIT ${batchSize}
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id;
        `;

    if (claimedEvents.length === 0) return 0;

    const ids = claimedEvents.map((e) => e.id);
    log.info({ count: ids.length }, 'Claimed OutboxEvents for dispatch');

    const events = await prisma.outboxEvent.findMany({
      where: { id: { in: ids } },
    });

    for (const event of events) {
      try {
        const payload = event.payload as unknown as AutomationJobPayload;

        // Ensure requestId traces across async boundaries
        if (!payload.requestId) {
          payload.requestId = uuidv4();
        }

        await enqueueAutomationJob(payload);

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'DISPATCHED',
            processedAt: new Date(),
            attempts: { increment: 1 },
          },
        });

        log.debug({ eventId: event.id, actionType: event.actionType }, 'Successfully dispatched OutboxEvent to Redis');
        incrementMetric('outboxEventsProcessed');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown Enqueue Error';
        log.error({ err: msg, eventId: event.id }, 'Failed to dispatch OutboxEvent');
        incrementMetric('outboxFailures');

        const nextAttempt = new Date();
        nextAttempt.setSeconds(nextAttempt.getSeconds() + Math.pow(2, event.attempts + 1) * 5); // 10s, 20s, 40s...

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'FAILED',
            lastError: msg,
            attempts: { increment: 1 },
            availableAt: nextAttempt,
          },
        });
      }
    }

    return events.length;
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : 'Unknown' }, 'Critical Polling Failure in OutboxDispatcher');
    return 0;
  }
}

/**
 * Sweeper mechanism to recover crashed processes where events got permanently stuck in PROCESSING.
 */
export async function recoverStaleEvents() {
  const log = logger.child({ module: 'outbox-sweeper' });
  try {
    const threshold = new Date(Date.now() - 5 * 60 * 1000);

    const result = await prisma.outboxEvent.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: threshold },
      },
      data: {
        status: 'PENDING',
      },
    });

    if (result.count > 0) {
      log.warn({ recoveredCount: result.count }, 'Recovered stale PROCESSING OutboxEvents');
    }
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : 'Unknown' }, 'Sweeper Failure in OutboxDispatcher');
  }
}
