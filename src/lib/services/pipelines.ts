import { prisma } from '@/lib/prisma';
import { requireOrganizationMember } from '@/lib/auth/authorization';

const DEFAULT_PIPELINE_NAME = 'Real Estate Sales';
const DEFAULT_STAGES = [
  { name: 'NEW', order: 10 },
  { name: 'CONTACTED', order: 20 },
  { name: 'QUALIFIED', order: 30 },
  { name: 'FOLLOW_UP', order: 40 },
  { name: 'APPOINTMENT_BOOKED', order: 50 },
  { name: 'CLOSED_WON', order: 60 },
  { name: 'CLOSED_LOST', order: 70 },
];

/**
 * Idempotently initializes the default pipeline for an organization.
 * Used during org creation or manual backfill.
 */
export async function initializeDefaultPipeline(organizationId: string) {
  return await prisma.$transaction(async (tx) => {
    let pipeline = await tx.pipeline.findFirst({
      where: { organizationId, name: DEFAULT_PIPELINE_NAME },
    });

    if (!pipeline) {
      pipeline = await tx.pipeline.create({
        data: {
          organizationId,
          name: DEFAULT_PIPELINE_NAME,
          description: 'Default sales pipeline',
        },
      });
    }

    for (const stageInput of DEFAULT_STAGES) {
      const existingStage = await tx.pipelineStage.findFirst({
        where: {
          organizationId,
          pipelineId: pipeline.id,
          name: stageInput.name,
        },
      });

      if (!existingStage) {
        await tx.pipelineStage.create({
          data: {
            organizationId,
            pipelineId: pipeline.id,
            name: stageInput.name,
            order: stageInput.order,
          },
        });
      }
    }

    return pipeline;
  });
}

export async function getPipelines(slug: string) {
  const { organization } = await requireOrganizationMember(slug);
  return prisma.pipeline.findMany({
    where: { organizationId: organization.id },
    include: {
      stages: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}
