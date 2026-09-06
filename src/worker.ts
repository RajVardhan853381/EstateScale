import { logger } from './lib/logger';
import { metrics } from './lib/logger/metrics';
import { Worker, Job } from 'bullmq';
import {
  AUTOMATION_QUEUE_NAME,
  AutomationJobPayload,
  ManualSmsJobPayload,
  AutomatedSmsJobPayload,
  AiAnalysisJobPayload,
} from './lib/queue/producer';
import { redisClient } from './lib/queue/client';
import { prisma } from './lib/prisma';
import { analyzeLead } from './lib/services/ai';
import { executeSendSms } from './lib/services/communication';

logger.info('🚀 Starting EstateScale Background Worker process...');

const processJob = async (job: Job<AutomationJobPayload>) => {
  const payload = job.data;
  console.log(
    `[Worker] Processing Job ${job.id} (Action: ${payload.actionType}) for Lead ${payload.leadId}`
  );

  if (payload.actionType === 'MANUAL_SMS') {
    await processManualSms(payload, job.id!);
  } else {
    await processAutomatedJob(payload, job.id!);
  }
};

async function processManualSms(payload: ManualSmsJobPayload, jobId: string) {
  const { organizationId, leadId, messageId } = payload;

  // Verify tenant ownership safely
  const message = await prisma.message.findFirst({
    where: { id: messageId, organizationId },
  });

  if (!message) {
    console.error(
      `[Worker] Manual SMS Error: Message ${messageId} not found in org ${organizationId}`
    );
    return; // Reject silently to avoid infinite retry loops on bad data
  }

  if (message.status !== 'QUEUED') {
    console.warn(`[Worker] Message ${messageId} is in status ${message.status}, skipping send.`);
    return;
  }

  try {
    await executeSendSms(organizationId, leadId, message.body, message.id);
  } catch (err: unknown) {
    console.error(`[Worker] Job ${jobId} failed sending manual SMS:`, err);
    throw err; // Trigger BullMQ backoff
  }
}

async function processAutomatedJob(
  payload: AutomatedSmsJobPayload | AiAnalysisJobPayload,
  jobId: string
) {
  const { organizationId, leadId, actionType, executionId } = payload;

  // State 1: Acknowledge processing cleanly before making any expensive external calls
  const execution = await prisma.automationExecution.findFirst({
    where: { id: executionId, organizationId },
  });

  if (!execution) {
    console.error(`[Worker] AutomationExecution ${executionId} not found in org ${organizationId}`);
    return;
  }

  // Idempotency guard: Don't re-run completed executions in case of at-least-once outbox duplicates
  if (execution.status === 'COMPLETED') {
    console.warn(`[Worker] Execution ${executionId} already COMPLETED, skipping retry.`);
    return;
  }

  await prisma.automationExecution.update({
    where: { id: executionId, organizationId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  try {
    if (actionType === 'AI_LEAD_ANALYSIS' || actionType === 'AI_LEAD_RESPONSE_GENERATION') {
      await performInternalAIAnalysis(organizationId, leadId);
    } else if (actionType === 'AUTOMATED_SMS') {
      await performInternalAutomatedSMS(organizationId, leadId);
    } else {
      throw new Error(`Unknown actionType: ${actionType}`);
    }

    // State 2: Finalize upon successful execution returns
    await prisma.automationExecution.update({
      where: { id: executionId, organizationId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Worker Error';
    console.error(`[Worker] Job ${jobId} failed:`, msg);

    // State 3: Hard failure registration
    await prisma.automationExecution.update({
      where: { id: executionId, organizationId },
      data: { status: 'FAILED', error: msg },
    });

    throw err;
  }
}

async function performInternalAIAnalysis(organizationId: string, leadId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new Error('Org not found');

  await analyzeLead(org.slug, leadId, undefined, { bypassAuth: true, organizationId });
}

async function performInternalAutomatedSMS(organizationId: string, leadId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new Error('Org not found');

  // We fetch the most recently suggested AI response if one exists as the automated content
  const assessment = await prisma.aiAssessment.findFirst({
    where: { organizationId, leadId },
    orderBy: { createdAt: 'desc' },
  });

  const body =
    assessment?.suggestedResponse ||
    'Hello! Thanks for reaching out. An agent will be with you shortly.';

  await executeSendSms(organizationId, leadId, body);
}

const worker = new Worker(AUTOMATION_QUEUE_NAME, processJob, {
  connection: redisClient,
  concurrency: 5,
});

worker.on('completed', (job) => {
  const jobMetaSuccess = (job.data as AutomationJobPayload & { _meta?: { correlationId?: string; outboxEventId?: string } })._meta || {};
        metrics.increment('queue.jobs.completed', 1, { queue: AUTOMATION_QUEUE_NAME, jobName: job.name });
        metrics.timing('queue.job.duration_ms', Date.now() - job.timestamp, { queue: AUTOMATION_QUEUE_NAME, jobName: job.name });
        logger.info({
            jobId: job.id,
            jobName: job.name,
            organizationId: job.data.organizationId,
            correlationId: jobMetaSuccess.correlationId,
            outboxEventId: jobMetaSuccess.outboxEventId,
            duration: Date.now() - job.timestamp
        }, 'Job completed successfully');
});

worker.on('failed', (job, err) => {
  const jobMetaErr = (job?.data as (AutomationJobPayload & { _meta?: { correlationId?: string; outboxEventId?: string } }) | undefined)?._meta || {};
        metrics.increment('queue.jobs.failed', 1, { queue: AUTOMATION_QUEUE_NAME, jobName: job?.name, errorType: err?.name });
        logger.error({
            err,
            jobId: job?.id,
            jobName: job?.name,
            organizationId: job?.data?.organizationId,
            correlationId: jobMetaErr.correlationId,
            outboxEventId: jobMetaErr.outboxEventId,
            duration: job ? Date.now() - job.timestamp : undefined
        }, 'Job failed with error');
});

const shutdown = async () => {
  logger.info('Shutting down worker gracefully...');
  await worker.close();
  await redisClient.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
