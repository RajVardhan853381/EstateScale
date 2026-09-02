import { prisma } from "@/lib/prisma";
import { leadSchema, paginationSchema, updateLeadSchema } from "@/lib/validations/crm";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { LeadActivityType, LeadStatus, Prisma } from "@prisma/client";

export async function createLead(slug: string, data: unknown) {
  const { organization, membership } = await requireOrganizationMember(slug);
  const validated = leadSchema.parse(data);

  return await prisma.$transaction(async (tx) => {
    let finalContactId = validated.contactId;

    if (!finalContactId && validated.contact) {
      // Find exact match or create
      const existing = await tx.contact.findFirst({
        where: {
          organizationId: organization.id,
          OR: [
            ...(validated.contact.email ? [{ email: validated.contact.email }] : []),
            ...(validated.contact.phone ? [{ phone: validated.contact.phone }] : []),
          ],
        },
      });

      if (existing) {
        finalContactId = existing.id;
      } else {
        const newContact = await tx.contact.create({
          data: {
            organizationId: organization.id,
            firstName: validated.contact.firstName,
            lastName: validated.contact.lastName,
            email: validated.contact.email,
            phone: validated.contact.phone,
          },
        });
        finalContactId = newContact.id;
      }
    }

    if (!finalContactId) {
      throw new Error("VALIDATION_ERROR: Contact is required.");
    }

    // Validate assigned agent belongs to organization
    if (validated.assignedUserId) {
      const agentMembership = await tx.organizationMembership.findUnique({
        where: { id: validated.assignedUserId },
      });
      if (!agentMembership || agentMembership.organizationId !== organization.id) {
        throw new Error("VALIDATION_ERROR: Assigned user is not valid for this organization.");
      }
    }

    // Validate Pipeline Stage
    if (validated.pipelineStageId) {
      const stage = await tx.pipelineStage.findUnique({
        where: { id: validated.pipelineStageId },
      });
      if (!stage || stage.organizationId !== organization.id) {
         throw new Error("VALIDATION_ERROR: Pipeline stage is not valid for this organization.");
      }
      if (validated.pipelineId && stage.pipelineId !== validated.pipelineId) {
          throw new Error("VALIDATION_ERROR: Pipeline stage does not belong to the selected pipeline.");
      }
    }

    const lead = await tx.lead.create({
      data: {
        organizationId: organization.id,
        contactId: finalContactId,
        assignedUserId: validated.assignedUserId,
        pipelineId: validated.pipelineId,
        pipelineStageId: validated.pipelineStageId,
        source: validated.source,
        status: validated.status || LeadStatus.NEW,
        score: validated.score,
        intent: validated.intent,
        budget: validated.budget,
        location: validated.location,
        propertyType: validated.propertyType,
        timeline: validated.timeline,
        notesText: validated.notesText,
      },
    });

    await tx.leadActivity.create({
      data: {
        organizationId: organization.id,
        leadId: lead.id,
        userId: membership.id,
        type: LeadActivityType.CREATED,
        description: "Lead created",
      },
    });

    return lead;
  });
}

export async function getLead(slug: string, leadId: string) {
  const { organization } = await requireOrganizationMember(slug);

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: organization.id,
    },
    include: {
      contact: true,
      assignedUser: {
        include: { user: true },
      },
      pipeline: true,
      pipelineStage: true,
      tags: {
        include: { tag: true },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
           user: { include: { user: true } }
        }
      },
      aiAssessments: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
    },
  });

  if (!lead) {
    throw new Error("NOT_FOUND");
  }

  return lead;
}

export async function listLeads(slug: string, queryParams: Record<string, unknown>) {
  const { organization } = await requireOrganizationMember(slug);
  const { page, limit } = paginationSchema.parse(queryParams);
  const skip = (page - 1) * limit;

  const whereClause: Prisma.LeadWhereInput = {
    organizationId: organization.id,
  };

  if (typeof queryParams.status === 'string') whereClause.status = queryParams.status as LeadStatus;
  if (typeof queryParams.source === 'string') whereClause.source = queryParams.source;
  if (typeof queryParams.assignedUserId === 'string') whereClause.assignedUserId = queryParams.assignedUserId;
  if (typeof queryParams.pipelineStageId === 'string') whereClause.pipelineStageId = queryParams.pipelineStageId;

  if (typeof queryParams.search === 'string' && queryParams.search) {
    whereClause.contact = {
      OR: [
        { firstName: { contains: queryParams.search, mode: "insensitive" } },
        { lastName: { contains: queryParams.search, mode: "insensitive" } },
        { email: { contains: queryParams.search, mode: "insensitive" } },
        { phone: { contains: queryParams.search, mode: "insensitive" } },
      ],
    };
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        contact: true,
        assignedUser: { include: { user: true } },
        pipelineStage: true,
        activities: {
           orderBy: { createdAt: 'desc' },
           take: 1,
        }
      },
    }),
    prisma.lead.count({
      where: whereClause,
    }),
  ]);

  return {
    leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateLead(slug: string, data: unknown) {
  const { organization, membership } = await requireOrganizationMember(slug);
  const validated = updateLeadSchema.parse(data);

  return await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findFirst({
       where: { id: validated.id, organizationId: organization.id }
    });

    if (!existingLead) throw new Error("NOT_FOUND");

    const lead = await tx.lead.update({
      where: { id: validated.id },
      data: {
        score: validated.score,
        intent: validated.intent,
        budget: validated.budget,
        location: validated.location,
        propertyType: validated.propertyType,
        timeline: validated.timeline,
      },
    });

    await tx.leadActivity.create({
      data: {
        organizationId: organization.id,
        leadId: lead.id,
        userId: membership.id,
        type: LeadActivityType.UPDATED,
        description: "Lead details updated",
      },
    });

    return lead;
  });
}

export async function assignLead(slug: string, leadId: string, assignedUserId: string | null) {
  const { organization, membership } = await requireOrganizationMember(slug);

  return await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findFirst({
       where: { id: leadId, organizationId: organization.id }
    });

    if (!existingLead) throw new Error("NOT_FOUND");

    if (assignedUserId) {
        const agentMembership = await tx.organizationMembership.findUnique({
            where: { id: assignedUserId },
        });
        if (!agentMembership || agentMembership.organizationId !== organization.id) {
            throw new Error("VALIDATION_ERROR: Assigned user is not valid for this organization.");
        }
    }

    const lead = await tx.lead.update({
      where: { id: leadId },
      data: { assignedUserId },
    });

    await tx.leadActivity.create({
      data: {
        organizationId: organization.id,
        leadId: lead.id,
        userId: membership.id,
        type: LeadActivityType.ASSIGNED,
        description: assignedUserId ? "Lead assigned to agent" : "Lead unassigned",
      },
    });

    return lead;
  });
}

export async function changeLeadStage(slug: string, leadId: string, pipelineStageId: string) {
    const { organization, membership } = await requireOrganizationMember(slug);

    return await prisma.$transaction(async (tx) => {
      const existingLead = await tx.lead.findFirst({
         where: { id: leadId, organizationId: organization.id }
      });

      if (!existingLead) throw new Error("NOT_FOUND");

      const stage = await tx.pipelineStage.findUnique({
        where: { id: pipelineStageId },
      });

      if (!stage || stage.organizationId !== organization.id) {
         throw new Error("VALIDATION_ERROR: Pipeline stage is not valid for this organization.");
      }

      if (existingLead.pipelineId && stage.pipelineId !== existingLead.pipelineId) {
          throw new Error("VALIDATION_ERROR: Pipeline stage does not belong to the lead's current pipeline.");
      }

      const lead = await tx.lead.update({
        where: { id: leadId },
        data: { pipelineStageId },
      });

      await tx.leadActivity.create({
        data: {
          organizationId: organization.id,
          leadId: lead.id,
          userId: membership.id,
          type: LeadActivityType.STATUS_CHANGED,
          description: `Lead moved to stage: ${stage.name}`,
        },
      });

      return lead;
    });
}
