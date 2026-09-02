import { Queue } from "bullmq";
import { redisClient } from "./client";

export type BaseJobPayload = {
    organizationId: string;
    leadId: string;
    eventId: string;
};

export type AutomatedSmsJobPayload = BaseJobPayload & {
    actionType: "AUTOMATED_SMS";
    executionId: string; // Refers to AutomationExecution.id
};

export type ManualSmsJobPayload = BaseJobPayload & {
    actionType: "MANUAL_SMS";
    messageId: string; // Refers to Message.id
};

export type AiAnalysisJobPayload = BaseJobPayload & {
    actionType: "AI_LEAD_ANALYSIS" | "AI_LEAD_RESPONSE_GENERATION";
    executionId: string;
};

// Discriminated union for worker routing safely
export type AutomationJobPayload = AutomatedSmsJobPayload | ManualSmsJobPayload | AiAnalysisJobPayload;

export const AUTOMATION_QUEUE_NAME = "automation-engine";

// Create queue instance safely pointing to our internal configured Redis
export const automationQueue = new Queue<AutomationJobPayload>(AUTOMATION_QUEUE_NAME, {
    connection: redisClient,
});

export async function enqueueAutomationJob(payload: AutomationJobPayload, delayMs: number = 0) {
    const jobId = payload.actionType === "MANUAL_SMS" ? payload.messageId : payload.executionId;

    return automationQueue.add(
        payload.actionType,
        payload,
        {
            jobId, // BullMQ ignores exact duplicate jobIds, providing infrastructure-level idempotency
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
