import { Queue } from "bullmq";
import { redisClient } from "./client";

// Define strict job payload typing to ensure authorization requirements
export type AutomationJobPayload = {
    organizationId: string;
    leadId: string;
    actionType: string;
    executionId: string; // Used for Idempotency logic natively tied to execution ID tracking
    eventId: string; // Used for observability and lineage
};

export const AUTOMATION_QUEUE_NAME = "automation-engine";

// Create queue instance safely pointing to our internal configured Redis
export const automationQueue = new Queue<AutomationJobPayload>(AUTOMATION_QUEUE_NAME, {
    connection: redisClient,
});

export async function enqueueAutomationJob(payload: AutomationJobPayload, delayMs: number = 0) {
    return automationQueue.add(
        payload.actionType,
        payload,
        {
            jobId: payload.executionId, // BullMQ ignores exact duplicate jobIds, providing infrastructure-level idempotency
            delay: delayMs,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000, // 5s, 10s, 20s
            },
            removeOnComplete: true, // Keep Redis clean
            removeOnFail: false, // Leave failed jobs for manual DLQ inspection
        }
    );
}
