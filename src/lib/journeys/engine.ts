import { prisma } from '@/lib/prisma';
import { JourneyDefinitionSchema } from './types';
import { enqueueJourneyJob } from './queue';
import { logger } from '@/lib/observability/logger';
import { Prisma, Journey } from '@prisma/client';

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

    if (journeys.length === 0) return;

    const journeyIds = journeys.map((j) => j.id);

    // Bulk fetch existing enrollments to prevent N+1 queries
    const existingEnrollments = await prisma.journeyEnrollment.findMany({
      where: {
        journeyId: { in: journeyIds },
        leadId,
        status: { in: ['PENDING', 'RUNNING', 'WAITING'] },
      },
      select: { journeyId: true },
    });

    const existingJourneyIds = new Set(existingEnrollments.map((e) => e.journeyId));

    for (const journey of journeys) {
      if (existingJourneyIds.has(journey.id)) {
        logger.info(
          { journeyId: journey.id, leadId },
          'Lead already enrolled in active journey, skipping.'
        );
        continue;
      }

      await this._createEnrollment(journey, organizationId, leadId, eventData);
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
        where: {
          journeyId,
          leadId,
          status: { in: ['PENDING', 'RUNNING', 'WAITING'] },
        },
      });

      if (existing) {
        logger.info({ journeyId, leadId }, 'Lead already enrolled in active journey, skipping.');
        return;
      }

      const journey = await prisma.journey.findUniqueOrThrow({
        where: { id: journeyId },
      });
      await this._createEnrollment(journey, organizationId, leadId, eventData);
    } catch (error: unknown) {
      logger.error(
        { error: (error as Error).message, journeyId, leadId },
        'Failed to enroll lead in journey'
      );
    }
  }

  private static async _createEnrollment(
    journey: Journey,
    organizationId: string,
    leadId: string,
    eventData: Record<string, unknown>
  ) {
    try {
      const definition = JourneyDefinitionSchema.parse(journey.steps);

      const enrollment = await prisma.journeyEnrollment.create({
        data: {
          organizationId,
          journeyId: journey.id,
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
        { error: (error as Error).message, journeyId: journey.id, leadId },
        'Failed to enroll lead in journey'
      );
    }
  }

  static async stepCompleted(
    enrollmentId: string,
    currentStepId: string,
    nextStepId?: string,
    _outputData?: Record<string, unknown>
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
