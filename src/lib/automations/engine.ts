import { prisma } from '../prisma';
import { enqueueAutomationJob } from '../queue/producer';
import { DomainEvent } from '../events/bus';

export async function evaluateAutomationsForEvent(event: DomainEvent) {
  try {
    console.log(`[AutomationEngine] Evaluating event ${event.type} for Lead ${event.leadId}`);

    const automations = await prisma.automation.findMany({
      where: {
        organizationId: event.organizationId,
        enabled: true,
        triggerType: event.type,
      },
    });

    if (automations.length === 0) return;

    const fiveMinutesAgo = new Date(Date.now() - 300000);
    const recentExecutions = await prisma.automationExecution.findMany({
      where: {
        organizationId: event.organizationId,
        leadId: event.leadId,
        automationId: { in: automations.map((a) => a.id) },
        createdAt: { gte: fiveMinutesAgo },
      },
      select: { automationId: true },
    });
    const recentExecutionAutomationIds = new Set(recentExecutions.map((e) => e.automationId));

    for (const automation of automations) {
      if (recentExecutionAutomationIds.has(automation.id)) continue;

      await prisma.$transaction(async (tx) => {
        const execution = await tx.automationExecution.create({
          data: {
            organizationId: event.organizationId,
            automationId: automation.id,
            leadId: event.leadId,
            status: 'PENDING',
          },
        });

        let actionType:
          'AUTOMATED_SMS' | 'MANUAL_SMS' | 'AI_LEAD_ANALYSIS' | 'AI_LEAD_RESPONSE_GENERATION' =
          'AI_LEAD_ANALYSIS';
        if (automation.actionType === 'AI_LEAD_RESPONSE_GENERATION')
          actionType = 'AI_LEAD_RESPONSE_GENERATION';
        if (automation.actionType === 'SEND_SMS') actionType = 'AUTOMATED_SMS';

        await enqueueAutomationJob({
          organizationId: event.organizationId,
          leadId: event.leadId,
          actionType,
          executionId: execution.id,
          eventId: event.eventId,
        } as Parameters<typeof enqueueAutomationJob>[0]);
      });
    }
  } catch (error) {
    console.error(`[AutomationEngine] Evaluation failed:`, error);
  }
}
