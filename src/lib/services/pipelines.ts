import { prisma } from "@/lib/prisma";

export const DEFAULT_PIPELINE_NAME = "Real Estate Sales";
export const DEFAULT_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "FOLLOW_UP",
  "APPOINTMENT_BOOKED",
  "CLOSED_WON",
  "CLOSED_LOST",
];

export async function backfillDefaultPipeline(organizationId: string) {
  // Check if any pipeline exists
  const existingPipeline = await prisma.pipeline.findFirst({
    where: { organizationId },
  });

  if (existingPipeline) {
    // Pipeline exists, do not overwrite or modify existing custom pipelines.
    return existingPipeline;
  }

  // Idempotent creation within a transaction
  return await prisma.$transaction(async (tx) => {
    // Double check inside transaction
    const stillExists = await tx.pipeline.findFirst({
      where: { organizationId },
    });

    if (stillExists) return stillExists;

    const newPipeline = await tx.pipeline.create({
      data: {
        organizationId,
        name: DEFAULT_PIPELINE_NAME,
        description: "Default Real Estate Sales Pipeline",
        stages: {
          create: DEFAULT_STAGES.map((name, index) => ({
            organizationId,
            name,
            order: index,
          })),
        },
      },
      include: {
        stages: true,
      },
    });

    return newPipeline;
  });
}
