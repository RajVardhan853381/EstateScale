import { prisma } from "../prisma";
import { enqueueAutomationJob } from "../queue/producer";
import { evaluateAutomationsForEvent } from "../automations/engine";

export type DomainEvent = {
    eventId: string;
    organizationId: string;
    leadId: string;
    type: "LEAD_CREATED" | "LEAD_UPDATED" | "MESSAGE_RECEIVED" | "MESSAGE_SENT" | "AI_ANALYSIS_COMPLETED" | "LEAD_STAGE_CHANGED";
    metadata?: Record<string, unknown>;
};

export async function publishDomainEvent(event: DomainEvent) {
    try {
        await evaluateAutomationsForEvent(event);
    } catch (error) {
        console.error(`[EventBus] Critical dispatch failure:`, error);
    }
}
