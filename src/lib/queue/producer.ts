import { Queue } from 'bullmq';
import { redisClient, isRedisConfigured } from './client';
import { prisma } from '../prisma';

export type BaseJobPayload = {
  organizationId: string;
  leadId: string;
  eventId: string;
};

export type AutomatedSmsJobPayload = BaseJobPayload & {
  actionType: 'AUTOMATED_SMS';
  executionId: string;
};

export type ManualSmsJobPayload = BaseJobPayload & {
  actionType: 'MANUAL_SMS';
  messageId: string;
};

export type AiAnalysisJobPayload = BaseJobPayload & {
  actionType: 'AI_LEAD_ANALYSIS' | 'AI_LEAD_RESPONSE_GENERATION';
  executionId: string;
};

export type AutomationJobPayload =
  | AutomatedSmsJobPayload
  | ManualSmsJobPayload
  | AiAnalysisJobPayload;

export const AUTOMATION_QUEUE_NAME = 'automation-engine';

// Only create BullMQ Queue if Redis is explicitly configured
export const automationQueue = isRedisConfigured
  ? new Queue<AutomationJobPayload>(AUTOMATION_QUEUE_NAME, {
      connection: redisClient,
    })
  : null;

async function executeJobDirectly(payload: AutomationJobPayload) {
  const { organizationId, leadId } = payload;

  if (payload.actionType === 'MANUAL_SMS') {
    const message = await prisma.message.findFirst({
      where: { id: payload.messageId, organizationId },
    });

    if (message && message.status === 'QUEUED') {
      const { executeSendSms } = await import('../services/communication');
      await executeSendSms(organizationId, leadId, message.body, message.id);
    }
  } else {
    // Automated executions
    const execution = await prisma.automationExecution.findFirst({
      where: { id: payload.executionId, organizationId },
    });

    if (!execution) return;

    await prisma.automationExecution.update({
      where: { id: payload.executionId, organizationId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    try {
      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!org) throw new Error('Organization not found');

      if (
        payload.actionType === 'AI_LEAD_ANALYSIS' ||
        payload.actionType === 'AI_LEAD_RESPONSE_GENERATION'
      ) {
        const { analyzeLead } = await import('../services/ai');
        await analyzeLead(org.slug, leadId, undefined, { bypassAuth: true, organizationId });
      } else if (payload.actionType === 'AUTOMATED_SMS') {
        const assessment = await prisma.aiAssessment.findFirst({
          where: { organizationId, leadId },
          orderBy: { createdAt: 'desc' },
        });

        let body = assessment?.suggestedResponse;
        if (!body) {
          try {
            const { generateOutreachResponse } = await import('../services/ai');
            body = await generateOutreachResponse(organizationId, leadId);
          } catch {
            body = 'Hello! Thanks for reaching out. An agent will be with you shortly.';
          }
        }

        const { executeSendSms } = await import('../services/communication');
        await executeSendSms(organizationId, leadId, body);
      }

      await prisma.automationExecution.update({
        where: { id: payload.executionId, organizationId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      await prisma.automationExecution.update({
        where: { id: payload.executionId, organizationId },
        data: { status: 'FAILED', error: msg },
      });
    }
  }
}

export async function enqueueAutomationJob(payload: AutomationJobPayload, delayMs: number = 0) {
  const jobId = payload.actionType === 'MANUAL_SMS' ? payload.messageId : payload.executionId;

  if (isRedisConfigured && automationQueue) {
    return automationQueue.add(payload.actionType, payload, {
      jobId,
      delay: delayMs,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  // Zero-Redis Asynchronous Decoupled Execution
  if (process.env.NODE_ENV === 'test' && process.env.TEST_SYNC_EXECUTION === 'true') {
    await executeJobDirectly(payload);
  } else {
    const { runBackgroundTask } = await import('../async/background-task');
    runBackgroundTask(async () => {
      await executeJobDirectly(payload);
    });
  }
  return { id: jobId };
}
