import { Worker, Job } from "bullmq";
import { redisClient } from "@/lib/redis";
import { JourneyEngine } from "./engine";
import { JOURNEY_QUEUE_NAME } from "./queue";
import { prisma } from "@/lib/prisma";
import { JourneyDefinitionSchema, JourneyStepConfig } from "./types";
import { logger } from "@/lib/observability/logger";
import { executeSendSms } from "@/lib/services/communication";

export function startJourneyWorker() {
  const worker = new Worker(
    JOURNEY_QUEUE_NAME,
    async (job: Job) => {
      const { organizationId, enrollmentId, stepId } = job.data;
      logger.info({ jobId: job.id, enrollmentId, stepId }, "Executing journey step");

      const enrollment = await prisma.journeyEnrollment.findUnique({
          where: { id: enrollmentId },
          include: { journey: true, lead: { include: { contact: true } } }
      });

      if (!enrollment || enrollment.status !== "RUNNING") return;

      const definition = JourneyDefinitionSchema.parse(enrollment.journey.steps);
      const step = definition.steps.find((s: JourneyStepConfig) => s.id === stepId);

      if (!step) {
          throw new Error(`Step ${stepId} not found in journey definition`);
      }

      const execution = await prisma.journeyExecution.create({
          data: {
              organizationId,
              enrollmentId,
              stepId,
              type: step.type,
              status: "RUNNING",
              startedAt: new Date()
          }
      });

      try {
          let nextStepId = step.nextStepId;

          if (step.type === "WAIT") {
              await prisma.journeyExecution.update({ where: { id: execution.id }, data: { status: "WAITING" } });
              await JourneyEngine.stepCompleted(enrollmentId, stepId, nextStepId);
              return;
          }

          if (step.type === "ACTION") {
              if (step.actionType === "SEND_SMS") {
                  const phone = enrollment.lead.contact?.phone;
                  if (phone) {
                      await executeSendSms(organizationId, enrollment.lead.id, step.actionConfig?.message || "Hello");
                  }
              }
              else if (step.actionType === "CREATE_TASK") {
                  // Explicitly skip missing Task model mapping in current schema slice, bound outbox event later
              }
          }

          if (step.type === "BRANCH" || step.type === "CONDITION") {
             const score = (enrollment.context as Record<string, unknown>)?.score as number || 0;
             const conditionMet = score > (step.condition?.value || 50);
             nextStepId = conditionMet ? step.truePathStepId : step.falsePathStepId;
          }

          await prisma.journeyExecution.update({ where: { id: execution.id }, data: { status: "COMPLETED", completedAt: new Date() } });

          await JourneyEngine.stepCompleted(enrollmentId, stepId, nextStepId);

      } catch (error: unknown) {
          logger.error({ error: (error as Error).message, enrollmentId, stepId }, "Journey step failed");
          await prisma.journeyExecution.update({ where: { id: execution.id }, data: { status: "FAILED", error: (error as Error).message } });
          await prisma.journeyEnrollment.update({ where: { id: enrollmentId }, data: { status: "FAILED", error: (error as Error).message } });
          throw error;
      }
    },
    { connection: redisClient }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Journey worker job failed");
  });

  return worker;
}
