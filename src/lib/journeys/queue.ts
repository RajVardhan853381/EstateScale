import { Queue } from 'bullmq';
import { redisClient, isRedisConfigured } from '@/lib/redis';

export const JOURNEY_QUEUE_NAME = 'journey-engine';

export const journeyQueue = isRedisConfigured
  ? new Queue(JOURNEY_QUEUE_NAME, {
      connection: redisClient,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    })
  : null;

export async function enqueueJourneyJob(
  organizationId: string,
  enrollmentId: string,
  stepId: string,
  delayMs: number = 0
) {
  if (isRedisConfigured && journeyQueue) {
    return journeyQueue.add(
      'execute-step',
      { organizationId, enrollmentId, stepId },
      {
        jobId: `journey-${enrollmentId}-${stepId}`, // Idempotency
        delay: delayMs,
      }
    );
  }

  // Zero-Redis Asynchronous Decoupled Execution
  const { executeJourneyStep } = await import('./worker');
  if (process.env.NODE_ENV === 'test' && process.env.TEST_SYNC_EXECUTION === 'true') {
    await executeJourneyStep(organizationId, enrollmentId, stepId);
  } else {
    const { runBackgroundTask } = await import('@/lib/async/background-task');
    runBackgroundTask(async () => {
      await executeJourneyStep(organizationId, enrollmentId, stepId);
    });
  }
  return { id: `journey-${enrollmentId}-${stepId}` };
}
