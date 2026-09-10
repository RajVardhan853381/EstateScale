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
import { Logger } from 'pino';
import { executeSendSms } from './lib/services/communication';
import logger from './lib/logger';
import { incrementMetric } from './lib/metrics';

logger.info('🚀 Starting EstateScale Background Worker process...');

const processJob = async (job: Job<AutomationJobPayload>) => {
  const payload = job.data;
  const reqId = payload.requestId || 'unknown-req-id';
  const log = logger.child({ reqId, jobId: job.id, actionType: payload.actionType, leadId: payload.leadId, organizationId: payload.organizationId });

  log.info('Processing Job');

  try {
    if (payload.actionType === 'MANUAL_SMS') {
      await processManualSms(payload, job.id!, log);
    } else {
      await processAutomatedJob(payload, job.id!, log);
    }
    incrementMetric('workerJobsProcessed');
  } catch (error) {
    incrementMetric('workerJobFailures');
    throw error;
  }
};

async function processManualSms(payload: ManualSmsJobPayload, jobId: string, log: Logger) {
  const { organizationId, leadId, messageId } = payload;

  const message = await prisma.message.findFirst({
    where: { id: messageId, organizationId },
  });

  if (!message) {
    log.error({ messageId }, 'Manual SMS Error: Message not found in org');
    return;
  }

  if (message.status !== 'QUEUED') {
    log.warn({ messageId, status: message.status }, 'Message is not QUEUED, skipping send.');
    return;
  }

  try {
    await executeSendSms(organizationId, leadId, message.body, message.id);
  } catch (err: unknown) {
    log.error({ err: err instanceof Error ? err.message : 'Unknown' }, 'Job failed sending manual SMS');
    throw err;
  }
}

async function processAutomatedJob(
  payload: AutomatedSmsJobPayload | AiAnalysisJobPayload,
  jobId: string,
  log: Logger
) {
  const { organizationId, leadId, actionType, executionId } = payload;

  const execution = await prisma.automationExecution.findFirst({
    where: { id: executionId, organizationId },
  });

  if (!execution) {
    log.error({ executionId }, 'AutomationExecution not found in org');
    return;
  }

  if (execution.status === 'COMPLETED') {
    log.warn({ executionId }, 'Execution already COMPLETED, skipping retry.');
    return;
  }

  await prisma.automationExecution.update({
    where: { id: executionId, organizationId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  try {
    if (actionType === 'AI_LEAD_ANALYSIS' || actionType === 'AI_LEAD_RESPONSE_GENERATION') {
      await performInternalAIAnalysis(organizationId, leadId);
      incrementMetric('aiRequests');
    } else if (actionType === 'AUTOMATED_SMS') {
      await performInternalAutomatedSMS(organizationId, leadId);
    } else {
      throw new Error(`Unknown actionType: ${actionType}`);
    }

    await prisma.automationExecution.update({
      where: { id: executionId, organizationId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    incrementMetric('automationExecutions');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Worker Error';
    log.error({ err: msg }, 'Automation Job failed');

    await prisma.automationExecution.update({
      where: { id: executionId, organizationId },
      data: { status: 'FAILED', error: msg },
    });

    incrementMetric('automationFailures');
    if (actionType.startsWith('AI_')) incrementMetric('aiFailures');

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
  logger.info({ jobId: job.id }, '✅ [Worker] Job completed successfully.');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, '❌ [Worker] Job failed');
});

const shutdown = async () => {
  logger.info('Shutting down worker gracefully...');
  await worker.close();
  await redisClient.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
