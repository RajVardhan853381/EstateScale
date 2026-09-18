import { prisma } from "../prisma";
import { enqueueAutomationJob } from "../queue/producer";
import { DomainEvent } from "../events/bus";

export async function evaluateAutomationsForEvent(event: DomainEvent) {
    try {
        console.log(`[AutomationEngine] Evaluating event ${event.type} for Lead ${event.leadId}`);

        const automations = await prisma.automation.findMany({
            where: {
                organizationId: event.organizationId,
                enabled: true,
                triggerType: event.type
            }
        });

        if (automations.length === 0) return;

        for (const automation of automations) {
            await prisma.$transaction(async (tx) => {
                const executions = await tx.automationExecution.findMany({
                    where: {
                        organizationId: event.organizationId,
                        automationId: automation.id,
                        leadId: event.leadId,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1
                });

                if (executions.length > 0) {
                    const lastExecution = executions[0];
                    if (Date.now() - lastExecution.createdAt.getTime() < 300000) {
                        return; // Prevent loops
                    }
                }

                const execution = await tx.automationExecution.create({
                    data: {
                        organizationId: event.organizationId,
                        automationId: automation.id,
                        leadId: event.leadId,
                        status: "PENDING"
                    }
                });

                let actionType: "AUTOMATED_SMS" | "MANUAL_SMS" | "AI_LEAD_ANALYSIS" | "AI_LEAD_RESPONSE_GENERATION" = "AI_LEAD_ANALYSIS";
                if (automation.actionType === "AI_LEAD_RESPONSE_GENERATION") actionType = "AI_LEAD_RESPONSE_GENERATION";
                if (automation.actionType === "SEND_SMS") actionType = "AUTOMATED_SMS";

                await enqueueAutomationJob({
                    organizationId: event.organizationId,
                    leadId: event.leadId,
                    actionType,
                    executionId: execution.id,
                    eventId: event.eventId
                } as Parameters<typeof enqueueAutomationJob>[0]);
            });
        }
    } catch (error) {
        console.error(`[AutomationEngine] Evaluation failed:`, error);
    }
}
