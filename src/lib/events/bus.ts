

import { evaluateAutomationsForEvent } from '../automations/engine';
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

    // 1. Cross-module link to Automations & Journeys
    await evaluateAutomationsForEvent(event);

    // 2. Cross-module link to Analytics pipeline manually (if needed for fast counts)
    if (event.type === 'AI_ANALYSIS_COMPLETED') {
      auditLogger.info({ score: event.metadata?.score }, 'AI Intelligence linkage active.');
      // Standard analytics handles aggregation automatically via Prisma grouping. No duplicate events needed.
    }
  } catch (error) {
    console.error(`[EventBus] Critical dispatch failure:`, error);
  }
}
