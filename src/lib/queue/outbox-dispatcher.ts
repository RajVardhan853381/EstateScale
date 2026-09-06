import { logger } from '@/lib/logger';
import { metrics } from '@/lib/logger/metrics';
import { prisma } from '../prisma';
import { enqueueAutomationJob, AutomationJobPayload } from './producer';

/**
 * Dispatcher is responsible for safely claiming PENDING OutboxEvents via
 * FOR UPDATE SKIP LOCKED to ensure atomic delivery across concurrent workers.
 */
export async function dispatchOutboxEvents(batchSize: number = 50) {
  try {
    // Raw SQL for safe concurrent polling using SKIP LOCKED pattern
    // We select the IDs safely and update them to PROCESSING in one atomic move
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

    // Fetch complete records securely via Prisma models now that they are locked
    const events = await prisma.outboxEvent.findMany({
      where: { id: { in: ids } },
    });

    for (const event of events) {
      try {
        // AT-LEAST-ONCE Delivery: Enqueue to Redis
        // Cast from JSON payload strictly back into expected Queue shape
        const payload = event.payload as unknown as AutomationJobPayload;
        const safeMeta = {
          correlationId: event.correlationId || undefined,
          organizationId: event.organizationId,
          outboxEventId: event.id,
          automationExecutionId: 'executionId' in payload ? payload.executionId : undefined,
          messageId: 'messageId' in payload ? payload.messageId : undefined,
        };
        (payload as AutomationJobPayload & { _meta?: { correlationId?: string; organizationId?: string; outboxEventId?: string; automationExecutionId?: string; messageId?: string; } })._meta = safeMeta;

        await enqueueAutomationJob(payload);

        // AT-LEAST-ONCE Delivery: Acknowledge success
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'DISPATCHED',
            processedAt: new Date(),
            attempts: { increment: 1 },
          },
        });
      } catch (err: unknown) {
        // Redis enqueue failed or parsing failed
        const msg = err instanceof Error ? err.message : 'Unknown Enqueue Error';
        metrics.increment('outbox.dispatch.failed', 1, { eventType: event.actionType });
        logger.error({ eventId: event.id, errMsg: msg, operation: 'outbox_dispatch' }, 'Failed to dispatch event');

        // Exponential backoff logic
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
    metrics.increment('outbox.poll.failed');
    logger.error({ err: error, operation: 'outbox_poll' }, 'Critical Polling Failure');
    return 0;
  }
}

/**
 * Sweeper mechanism to recover crashed processes where events got permanently stuck in PROCESSING.
 */
export async function recoverStaleEvents() {
  try {
    // Find events stuck in PROCESSING for more than 5 minutes
    const threshold = new Date(Date.now() - 5 * 60 * 1000);

    await prisma.outboxEvent.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: threshold },
      },
      data: {
        status: 'PENDING',
      },
    });
  } catch (error) {
    logger.error({ err: error, operation: 'outbox_sweep' }, 'Sweeper Failure');
  }
}
