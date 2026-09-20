import { prisma } from '@/lib/prisma';
import { JourneyDefinitionSchema } from './types';
import { enqueueJourneyJob } from './queue';
import { logger } from '@/lib/observability/logger';
import { Prisma } from '@prisma/client';

export class JourneyEngine {
  static async evaluateTrigger(
    organizationId: string,
    triggerType: string,
    leadId: string,
    eventData: Record<string, unknown> = {}
  ) {
    const journeys = await prisma.journey.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        triggerType,
      },
    });

    for (const journey of journeys) {
      await this.enrollLead(organizationId, journey.id, leadId, eventData);
    }
  }

  static async enrollLead(
    organizationId: string,
    journeyId: string,
    leadId: string,
    eventData: Record<string, unknown> = {}
  ) {
    try {
      const existing = await prisma.journeyEnrollment.findFirst({
        where: { journeyId, leadId, status: { in: ['PENDING', 'RUNNING', 'WAITING'] } },
      });

      if (existing) {
        logger.info({ journeyId, leadId }, 'Lead already enrolled in active journey, skipping.');
        return;
      }

      const journey = await prisma.journey.findUniqueOrThrow({ where: { id: journeyId } });
      const definition = JourneyDefinitionSchema.parse(journey.steps);

      const enrollment = await prisma.journeyEnrollment.create({
        data: {
          organizationId,
          journeyId,
          leadId,
          status: 'RUNNING',
          journeyVersion: journey.version,
          currentStepId: definition.startStepId,
          context: eventData as unknown as Prisma.InputJsonValue,
          startedAt: new Date(),
        },
      });

      await enqueueJourneyJob(organizationId, enrollment.id, definition.startStepId);
    } catch (error: unknown) {
      logger.error(
        { error: (error as Error).message, journeyId, leadId },
        'Failed to enroll lead in journey'
      );
    }
  }

  static async stepCompleted(
    enrollmentId: string,
    currentStepId: string,
    nextStepId?: string

  ) {
    if (!nextStepId) {
      await prisma.journeyEnrollment.update({
        where: { id: enrollmentId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      return;
    }

    const enrollment = await prisma.journeyEnrollment.update({
      where: { id: enrollmentId },
      data: { currentStepId: nextStepId },
    });

    await enqueueJourneyJob(enrollment.organizationId, enrollment.id, nextStepId);
  }
}
