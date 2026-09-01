import { prisma } from "@/lib/prisma";
import { DomainEvent } from "@/lib/events/bus";
import { enqueueAutomationJob } from "@/lib/queue/producer";
import { Automation } from "@prisma/client";

export async function evaluateAutomationsForEvent(event: DomainEvent) {
    const { type, organizationId, leadId, eventId } = event;

    // 1. Fetch enabled automations for this tenant mapping to this trigger.
    const automations = await prisma.automation.findMany({
        where: {
            organizationId,
            triggerType: type,
            enabled: true,
        }
    });

    if (!automations.length) return;

    // 2. Loop Protection & Deduplication
    for (const automation of automations) {
        await processAutomationTrigger(organizationId, leadId, eventId, automation);
    }
}

async function processAutomationTrigger(organizationId: string, leadId: string, eventId: string, automation: Automation) {
    // Avoid triggering identical automations in rapid infinite loops safely natively at DB transaction level
    const result = await prisma.$transaction(async (tx) => {
        // Idempotency: Did we already execute this specific automation for this exact event?
        // Note: For true distributed idempotency we create a deterministic executionId hash.
        const executionId = `${organizationId}-${automation.id}-${leadId}-${eventId}`;

        const priorExecution = await tx.automationExecution.findUnique({
            where: { id: executionId }
        });

        if (priorExecution) {
            // Drop silently, idempotency protection triggered.
            return null;
        }

        // Loop Protection: Avoid firing >5 times a day for the same lead and automation.
        const loopCount = await tx.automationExecution.count({
            where: {
                organizationId,
                leadId,
                automationId: automation.id,
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
        });

        if (loopCount >= 5) {
            console.warn(`[AutomationEngine] Loop protection engaged for lead ${leadId} on automation ${automation.id}`);
            return null;
        }

        // Initialize execution status safely.
        return await tx.automationExecution.create({
            data: {
                id: executionId,
                organizationId,
                automationId: automation.id,
                leadId,
                status: "PENDING"
            }
        });
    });

    if (result) {
        // 3. Dispatch to BullMQ for actual delayed execution outside the request scope.
        await enqueueAutomationJob({
            organizationId,
            leadId,
            actionType: automation.actionType,
            executionId: result.id,
            eventId
        });
    }
}
