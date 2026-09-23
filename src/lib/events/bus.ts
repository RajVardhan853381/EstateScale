import { evaluateAutomationsForEvent } from '../automations/engine';
import { JourneyEngine } from '../journeys/engine';
import { auditLogger } from '../observability/logger';

export type DomainEvent = {
  eventId: string;
  organizationId: string;
  leadId: string;
  type:
    | 'LEAD_CREATED'
    | 'LEAD_UPDATED'
    | 'MESSAGE_RECEIVED'
    | 'MESSAGE_SENT'
    | 'AI_ANALYSIS_COMPLETED'
    | 'LEAD_STAGE_CHANGED';
  metadata?: Record<string, unknown>;
};

export async function publishDomainEvent(event: DomainEvent) {
  try {
    auditLogger.info(
      {
        action: event.type,
        organizationId: event.organizationId,
        resourceId: event.leadId,
        metadata: event.metadata,
      },
      'Domain event published'
    );

    // 1. Cross-module link to Automations
    await evaluateAutomationsForEvent(event);

    // 2. Cross-module link to Journeys
    try {
      await JourneyEngine.evaluateTrigger(
        event.organizationId,
        event.type,
        event.leadId,
        event.metadata
      );

      // Evaluate specialized journey triggers based on event metadata
      if (event.type === 'LEAD_UPDATED' || event.type === 'AI_ANALYSIS_COMPLETED') {
        const status = event.metadata?.status || event.metadata?.qualification;
        if (status === 'HOT') {
          await JourneyEngine.evaluateTrigger(
            event.organizationId,
            'LEAD_BECAME_HOT',
            event.leadId,
            event.metadata
          );
        } else if (status === 'ARCHIVED' || status === 'LOST') {
          await JourneyEngine.evaluateTrigger(
            event.organizationId,
            'LEAD_BECAME_AT_RISK',
            event.leadId,
            event.metadata
          );
        }
      }

      if (event.type === 'LEAD_STAGE_CHANGED') {
        await JourneyEngine.evaluateTrigger(
          event.organizationId,
          'OPPORTUNITY_STAGE_CHANGED',
          event.leadId,
          event.metadata
        );
      }
    } catch (journeyErr) {
      console.error(`[EventBus] Journey trigger evaluation failure:`, journeyErr);
    }

    // 3. Cross-module link to Analytics pipeline manually (if needed for fast counts)
    if (event.type === 'AI_ANALYSIS_COMPLETED') {
      auditLogger.info({ score: event.metadata?.score }, 'AI Intelligence linkage active.');
      // Standard analytics handles aggregation automatically via Prisma grouping. No duplicate events needed.
    }

    // 4. Cross-module link to Outbound Webhook subscriptions
    try {
      const { dispatchOutboundWebhook } = await import('../services/webhooks');
      await dispatchOutboundWebhook(event.organizationId, event.type, {
        leadId: event.leadId,
        eventId: event.eventId,
        ...(event.metadata || {}),
      });
    } catch (webhookErr) {
      console.error('[EventBus] Outbound webhook dispatch failure:', webhookErr);
    }
  } catch (error) {
    console.error(`[EventBus] Critical dispatch failure:`, error);
  }
}
