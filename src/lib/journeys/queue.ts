import { Queue } from "bullmq";
import { redisClient } from "@/lib/redis";

export const JOURNEY_QUEUE_NAME = "journey-engine";

export const journeyQueue = new Queue(JOURNEY_QUEUE_NAME, {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000
    },
    removeOnComplete: true
  }
});

export async function enqueueJourneyJob(organizationId: string, enrollmentId: string, stepId: string, delayMs: number = 0) {
  return journeyQueue.add("execute-step", { organizationId, enrollmentId, stepId }, {
    jobId: `journey-${enrollmentId}-${stepId}`, // Idempotency
    delay: delayMs
  });
}
