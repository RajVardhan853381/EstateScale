import { Worker, Job } from 'bullmq';
import { redisClient, isRedisConfigured } from '@/lib/redis';
import { JourneyEngine } from './engine';
import { JOURNEY_QUEUE_NAME } from './queue';
import { prisma } from '@/lib/prisma';
import { JourneyDefinitionSchema, JourneyStepConfig } from './types';
import { logger, auditLogger } from '@/lib/observability/logger';
import { executeSendSms } from '@/lib/services/communication';
import { validateLeadStatusTransition } from '@/lib/domain/lead-state-machine';
import { LeadStatus } from '@prisma/client';
import { publishDomainEvent } from '@/lib/events/bus';
import crypto from 'node:crypto';

export async function executeJourneyStep(
  organizationId: string,
  enrollmentId: string,
  stepId: string
) {
  logger.info({ enrollmentId, stepId }, 'Executing journey step');

  const enrollment = await prisma.journeyEnrollment.findUnique({
    where: { id: enrollmentId },
    include: { journey: true, lead: { include: { contact: true } } },
  });

  if (!enrollment || enrollment.status !== 'RUNNING') return;

  const definition = JourneyDefinitionSchema.parse(enrollment.journey.steps);
  const step = definition.steps.find((s: JourneyStepConfig) => s.id === stepId);

  if (!step) {
    throw new Error(`Step ${stepId} not found in journey definition`);
  }

  // Safe crash recovery wrapper:
  let execution = await prisma.journeyExecution.findFirst({
    where: { enrollmentId, stepId },
  });

  if (execution?.status === 'COMPLETED') {
    logger.info({ executionId: execution.id }, 'Step already completed. Idempotent skip.');
    return;
  }

  if (!execution) {
    execution = await prisma.journeyExecution.create({
      data: {
        organizationId,
        enrollmentId,
        stepId,
        type: step.type,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });
  }

  try {
    let nextStepId = step.nextStepId;

    if (step.type === 'WAIT') {
      const delayMs = step.delayMs || 0;
      if (delayMs > 0) {
        const scheduledFor = new Date(Date.now() + delayMs);
        await prisma.journeyExecution.update({
          where: { id: execution.id },
          data: { status: 'WAITING', scheduledFor },
        });
        logger.info(
          { enrollmentId, stepId, scheduledFor },
          'Journey step paused in WAITING state until scheduled time'
        );
        return; // Safely stop and await scheduled wakeup
      }

      await prisma.journeyExecution.update({
        where: { id: execution.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      await JourneyEngine.stepCompleted(enrollmentId, stepId, nextStepId);
      return;
    }

    if (step.type === 'ACTION') {
      if (step.actionType === 'SEND_SMS') {
        const phone = enrollment.lead.contact?.phone;
        if (phone) {
          await executeSendSms(
            organizationId,
            enrollment.lead.id,
            step.actionConfig?.message || 'Hello'
          );
        }
      } else if (step.actionType === 'UPDATE_LEAD_STATUS') {
        const targetStatus = step.actionConfig?.status as LeadStatus | undefined;
        if (targetStatus) {
          const currentStatus = enrollment.lead.status;
          validateLeadStatusTransition(currentStatus, targetStatus);

          await prisma.lead.update({
            where: { id: enrollment.lead.id, organizationId },
            data: { status: targetStatus },
          });

          await prisma.leadActivity.create({
            data: {
              organizationId,
              leadId: enrollment.lead.id,
              type: 'STATUS_CHANGED',
              description: `Lead status updated to ${targetStatus} via Journey automation`,
              metadata: {
                previousStatus: currentStatus,
                newStatus: targetStatus,
                journeyId: enrollment.journeyId,
                stepId,
              },
            },
          });

          await publishDomainEvent({
            eventId: crypto.randomUUID(),
            organizationId,
            leadId: enrollment.lead.id,
            type: 'LEAD_UPDATED',
            metadata: {
              status: targetStatus,
              previousStatus: currentStatus,
            },
          });
        }
      } else if (step.actionType === 'ASSIGN_LEAD') {
        const assignedUserId = (step.actionConfig?.assignedUserId as string) || null;
        if (assignedUserId) {
          const member = await prisma.organizationMembership.findFirst({
            where: { id: assignedUserId, organizationId },
            include: { user: true },
          });
          if (!member) {
            throw new Error(
              `VALIDATION_ERROR: Assigned user ${assignedUserId} is not a member of organization ${organizationId}`
            );
          }

          await prisma.lead.update({
            where: { id: enrollment.lead.id, organizationId },
            data: { assignedUserId },
          });

          await prisma.leadActivity.create({
            data: {
              organizationId,
              leadId: enrollment.lead.id,
              type: 'ASSIGNED',
              description: `Lead assigned to ${member.user?.name || member.user?.email || 'agent'} via Journey automation`,
              metadata: {
                assignedUserId,
                journeyId: enrollment.journeyId,
                stepId,
              },
            },
          });

          await publishDomainEvent({
            eventId: crypto.randomUUID(),
            organizationId,
            leadId: enrollment.lead.id,
            type: 'LEAD_UPDATED',
            metadata: {
              assignedUserId,
            },
          });
        }
      } else if (step.actionType === 'CREATE_TASK') {
        const taskTitle =
          (step.actionConfig?.title as string) ||
          (step.actionConfig?.task as string) ||
          (step.actionConfig?.description as string) ||
          'Follow-up task created by journey';
        const taskDueDate = step.actionConfig?.dueDate
          ? new Date(step.actionConfig.dueDate as string)
          : null;
        const assignedUserId =
          (step.actionConfig?.assignedUserId as string) ||
          enrollment.lead.assignedUserId ||
          null;

        await prisma.leadActivity.create({
          data: {
            organizationId,
            leadId: enrollment.lead.id,
            userId: assignedUserId,
            type: 'FOLLOW_UP',
            description: taskTitle,
            metadata: {
              isTask: true,
              title: taskTitle,
              dueDate: taskDueDate?.toISOString() || null,
              priority: step.actionConfig?.priority || 'NORMAL',
              status: 'PENDING',
              journeyId: enrollment.journeyId,
              stepId,
            },
          },
        });
      } else if (step.actionType === 'NOTIFY_AGENT') {
        const message =
          (step.actionConfig?.message as string) ||
          (step.actionConfig?.notification as string) ||
          `Action required for lead ${enrollment.lead.contact?.firstName || ''} ${enrollment.lead.contact?.lastName || ''}`.trim();
        const recipientUserId =
          (step.actionConfig?.agentId as string) ||
          (step.actionConfig?.userId as string) ||
          enrollment.lead.assignedUserId ||
          null;

        await prisma.leadActivity.create({
          data: {
            organizationId,
            leadId: enrollment.lead.id,
            userId: recipientUserId,
            type: 'SYSTEM',
            description: `Agent notification: ${message}`,
            metadata: {
              notification: true,
              message,
              recipientUserId,
              journeyId: enrollment.journeyId,
              stepId,
            },
          },
        });

        auditLogger.info(
          {
            organizationId,
            leadId: enrollment.lead.id,
            recipientUserId,
            message,
          },
          'Agent notified via Journey action'
        );
      }
    }

    if (step.type === 'AI_DECISION') {
      const { evaluateJourneyDecision } = await import('@/lib/services/ai');
      const criteria =
        (step.actionConfig?.criteria as string) ||
        'Determine if lead exhibits sufficient purchase intent and financial qualification';
      const decisionResult = await evaluateJourneyDecision(
        organizationId,
        criteria,
        {
          leadId: enrollment.lead.id,
          score: (enrollment.context as Record<string, unknown>)?.score,
          intent: enrollment.lead.intent,
          budget: enrollment.lead.budget,
          timeline: enrollment.lead.timeline,
        }
      );
      nextStepId = decisionResult.decision ? step.truePathStepId : step.falsePathStepId;
    }

    if (step.type === 'BRANCH' || step.type === 'CONDITION') {
      const score = ((enrollment.context as Record<string, unknown>)?.score as number) || 0;
      const conditionMet = score > (step.condition?.value || 50);
      nextStepId = conditionMet ? step.truePathStepId : step.falsePathStepId;
    }

    await prisma.journeyExecution.update({
      where: { id: execution.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await JourneyEngine.stepCompleted(enrollmentId, stepId, nextStepId);
  } catch (error: unknown) {
    logger.error(
      { error: (error as Error).message, enrollmentId, stepId },
      'Journey step failed'
    );
    await prisma.journeyExecution.update({
      where: { id: execution.id },
      data: { status: 'FAILED', error: (error as Error).message },
    });
    throw error;
  }
}

export function startJourneyWorker() {
  if (!isRedisConfigured) {
    logger.info({}, 'Redis not configured, journey worker disabled in zero-Redis mode.');
    return null;
  }

  const worker = new Worker(
    JOURNEY_QUEUE_NAME,
    async (job: Job) => {
      const { organizationId, enrollmentId, stepId } = job.data;
      await executeJourneyStep(organizationId, enrollmentId, stepId);
    },
    {
      connection: redisClient,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Journey worker job failed');
  });

  return worker;
}

/**
 * Recovers executions stuck in RUNNING state due to crashed workers or terminated serverless invocations.
 * Resets them to WAITING with scheduledFor set to now so they are immediately retried.
 */
export async function recoverStaleJourneyExecutions(
  staleThresholdMs: number = 10 * 60 * 1000 // 10 minutes
): Promise<number> {
  const staleCutoff = new Date(Date.now() - staleThresholdMs);

  const staleRecords = await prisma.journeyExecution.updateMany({
    where: {
      status: 'RUNNING',
      startedAt: { lte: staleCutoff },
    },
    data: {
      status: 'WAITING',
      scheduledFor: new Date(),
    },
  });

  if (staleRecords.count > 0) {
    logger.warn(
      { count: staleRecords.count, cutoff: staleCutoff },
      'Recovered stale RUNNING journey executions'
    );
  }

  return staleRecords.count;
}

export async function processScheduledJourneySteps() {
  // First, recover any executions stuck in RUNNING from prior crashed workers
  await recoverStaleJourneyExecutions();

  const dueExecutions = await prisma.journeyExecution.findMany({
    where: {
      status: 'WAITING',
      scheduledFor: { lte: new Date() },
    },
    include: { enrollment: { include: { journey: true } } },
    take: 25,
  });

  let processed = 0;
  for (const exec of dueExecutions) {
    try {
      // Concurrency lock: Atomically claim the execution
      const claim = await prisma.journeyExecution.updateMany({
        where: { id: exec.id, status: 'WAITING' },
        data: { status: 'RUNNING' },
      });

      if (claim.count === 0) {
        // Already claimed by another concurrent worker/request
        continue;
      }

      const definition = JourneyDefinitionSchema.parse(exec.enrollment.journey.steps);
      const step = definition.steps.find((s: JourneyStepConfig) => s.id === exec.stepId);
      if (step) {
        await prisma.journeyExecution.update({
          where: { id: exec.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        await JourneyEngine.stepCompleted(exec.enrollmentId, exec.stepId, step.nextStepId);
        processed++;
      }
    } catch (err: unknown) {
      logger.error({ executionId: exec.id, err }, 'Failed to resume scheduled journey step');
      await prisma.journeyExecution
        .update({
          where: { id: exec.id },
          data: {
            status: 'FAILED',
            error: err instanceof Error ? err.message : 'Step resumption error',
          },
        })
        .catch(() => {});
    }
  }

  return { processed, totalDue: dueExecutions.length };
}
