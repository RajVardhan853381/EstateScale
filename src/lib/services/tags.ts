import { prisma } from "@/lib/prisma";
import { tagSchema } from "@/lib/validations/crm";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { LeadActivityType } from "@prisma/client";

export async function createTag(slug: string, data: unknown) {
  const { organization } = await requireOrganizationMember(slug);
  const validated = tagSchema.parse(data);

  return prisma.tag.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: validated.name,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: validated.name,
    },
  });
}

export async function listTags(slug: string) {
  const { organization } = await requireOrganizationMember(slug);

  return prisma.tag.findMany({
    where: { organizationId: organization.id },
    orderBy: { name: "asc" },
  });
}

export async function addTagToLead(slug: string, leadId: string, tagId: string) {
  const { organization, membership } = await requireOrganizationMember(slug);

  return await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({
        where: { id: leadId, organizationId: organization.id }
    });
    if (!lead) throw new Error("NOT_FOUND");

    const tag = await tx.tag.findFirst({
        where: { id: tagId, organizationId: organization.id }
    });
    if (!tag) throw new Error("NOT_FOUND");

    const existingLink = await tx.leadTag.findUnique({
        where: {
            leadId_tagId: { leadId, tagId }
        }
    });

    if (existingLink) return existingLink;

    const leadTag = await tx.leadTag.create({
      data: { leadId, tagId },
    });

    await tx.leadActivity.create({
      data: {
        organizationId: organization.id,
        leadId,
        userId: membership.id,
        type: LeadActivityType.TAG_ADDED,
        description: `Added tag: ${tag.name}`,
      },
    });

    return leadTag;
  });
}

export async function removeTagFromLead(slug: string, leadId: string, tagId: string) {
  const { organization, membership } = await requireOrganizationMember(slug);

  return await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({
        where: { id: leadId, organizationId: organization.id }
    });
    if (!lead) throw new Error("NOT_FOUND");

    const tag = await tx.tag.findFirst({
        where: { id: tagId, organizationId: organization.id }
    });
    if (!tag) throw new Error("NOT_FOUND");

    await tx.leadTag.delete({
      where: {
        leadId_tagId: { leadId, tagId }
      },
    });

    await tx.leadActivity.create({
      data: {
        organizationId: organization.id,
        leadId,
        userId: membership.id,
        type: LeadActivityType.TAG_REMOVED,
        description: `Removed tag: ${tag.name}`,
      },
    });
  });
}
