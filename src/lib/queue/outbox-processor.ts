import { prisma } from "../prisma";
import { enqueueAutomationJob, AutomationJobPayload } from "./producer";
import { auditLogger } from "../observability/logger";

export async function processOutboxEvents() {
    // Lock events to this worker safely using PostgreSQL FOR UPDATE SKIP LOCKED pattern natively supported by updating with a status filter

    // Instead of raw raw SQL locking which is complex across Prisma,
    // we use a safe two-step claim via findFirst + update,
    // bounded by PENDING state and an attempts limit for poison jobs.

    const BATCH_SIZE = 50;

    try {
        const events = await prisma.outboxEvent.findMany({
            where: {
                status: "PENDING",
                attempts: { lt: 5 }
            },
            orderBy: { createdAt: "asc" },
            take: BATCH_SIZE
        });

        if (events.length === 0) return;

        auditLogger.info({ count: events.length }, "Processing outbox batch");

        for (const event of events) {
            try {
                // Claim it
                const claimed = await prisma.outboxEvent.update({
                    where: { id: event.id, status: "PENDING" },
                    data: { status: "PROCESSING", attempts: { increment: 1 }, lastAttemptAt: new Date() }
                });

                if (!claimed) continue; // Someone else claimed it

                // Dispatch to Redis/BullMQ reliably
                await enqueueAutomationJob(event.payload as unknown as AutomationJobPayload);

                // Mark complete
                await prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: { status: "COMPLETED" }
                });

            } catch (error) {
                auditLogger.error({ eventId: event.id, error: (error as Error).message }, "Failed to process outbox event");
                await prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: { status: "FAILED", error: (error as Error).message }
                });
            }
        }
    } catch (error) {
        auditLogger.error({ error: (error as Error).message }, "Outbox processor critical failure");
    }
}

// Recover stale processing events (Worker crashed mid-process)
export async function recoverStaleOutboxEvents() {
    const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    const staleThreshold = new Date(Date.now() - STALE_TIMEOUT_MS);

    try {
        const staleCount = await prisma.outboxEvent.updateMany({
            where: {
                status: "PROCESSING",
                lastAttemptAt: { lt: staleThreshold }
            },
            data: { status: "PENDING" } // Throw back to retry
        });

        if (staleCount.count > 0) {
            auditLogger.warn({ count: staleCount.count }, "Recovered stale outbox events");
        }
    } catch (error) {
        auditLogger.error({ error: (error as Error).message }, "Failed to recover stale outbox events");
    }
}
