import { evaluateAutomationsForEvent } from "@/lib/automations/engine";
import { z } from "zod";
import crypto from "crypto";

export const EventTypeSchema = z.enum(["LEAD_CREATED", "LEAD_UPDATED", "AI_ANALYSIS_COMPLETED", "LEAD_STAGE_CHANGED"]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const DomainEventSchema = z.object({
    eventId: z.string().uuid().default(() => crypto.randomUUID()),
    type: EventTypeSchema,
    organizationId: z.string(),
    leadId: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DomainEvent = z.infer<typeof DomainEventSchema>;

// In-memory application event bus.
// Emits internal non-blocking events securely isolated per organization context.
export async function publishDomainEvent(eventData: Omit<DomainEvent, "eventId">) {
    try {
        const validatedEvent = DomainEventSchema.parse({
            ...eventData,
            eventId: crypto.randomUUID()
        });

        // Fire-and-forget: offload automation processing asynchronously so the primary CRM mutation isn't stalled.
        evaluateAutomationsForEvent(validatedEvent).catch((err: unknown) => {
            console.error(`[EventBus] Error evaluating automations for event ${validatedEvent.type}`, err);
        });
    } catch (err) {
        console.error(`[EventBus] Failed to publish event`, err);
    }
}
