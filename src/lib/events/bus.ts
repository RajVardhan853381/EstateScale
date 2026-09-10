import { prisma } from '../prisma';
import { enqueueAutomationJob } from '../queue/producer';
import { evaluateAutomationsForEvent } from '../automations/engine';
import logger from '../logger';
import { getRequestId } from '../correlation';

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
  requestId?: string;
};

export async function publishDomainEvent(event: DomainEvent) {
  const reqId = await getRequestId();
  event.requestId = reqId;

  const log = logger.child({ reqId, eventId: event.eventId, type: event.type, organizationId: event.organizationId });
  log.info('Publishing Domain Event');

  try {
    await evaluateAutomationsForEvent(event);
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : 'Unknown' }, 'Critical dispatch failure in EventBus');
  }
}
