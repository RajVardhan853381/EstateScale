import { prisma } from "@/lib/prisma";
import { requireOrganizationMember } from "@/lib/auth/authorization";

export async function listLeadActivities(slug: string, leadId: string) {
  const { organization } = await requireOrganizationMember(slug);

  const existingLead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: organization.id }
  });

  if (!existingLead) throw new Error("NOT_FOUND");

  return prisma.leadActivity.findMany({
    where: {
      organizationId: organization.id,
      leadId,
    },
    orderBy: { createdAt: "desc" },
    include: {
        user: { include: { user: true } }
    },
    take: 100 // Prevent arbitrary scaling of memory consumption
  });
}
