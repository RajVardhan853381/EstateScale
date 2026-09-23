import { prisma } from '@/lib/prisma';
import { leadSchema, paginationSchema, updateLeadSchema } from '@/lib/validations/crm';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { validateLeadStatusTransition } from '@/lib/domain/lead-state-machine';
import { recordAuditLog } from '@/lib/services/audit';
import { publishDomainEvent } from '@/lib/events/bus';
import { LeadActivityType, LeadStatus, Prisma } from '@prisma/client';
import crypto from 'crypto';

export async function createLead(slug: string, data: unknown) {
  const { organization, membership } = await requireOrganizationMember(slug);
  const validated = leadSchema.parse(data);

  const lead = await prisma.$transaction(async (tx) => {
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
      throw new Error('VALIDATION_ERROR: Contact is required.');
    }

    // Validate assigned agent belongs to organization
    if (validated.assignedUserId) {
      const agentMembership = await tx.organizationMembership.findUnique({
        where: { id: validated.assignedUserId },
      });
      if (!agentMembership || agentMembership.organizationId !== organization.id) {
        throw new Error('VALIDATION_ERROR: Assigned user is not valid for this organization.');
      }
    }

    // Validate Pipeline Stage
    if (validated.pipelineStageId) {
      const stage = await tx.pipelineStage.findUnique({
        where: { id: validated.pipelineStageId },
      });
      if (!stage || stage.organizationId !== organization.id) {
        throw new Error('VALIDATION_ERROR: Pipeline stage is not valid for this organization.');
      }
      if (validated.pipelineId && stage.pipelineId !== validated.pipelineId) {
        throw new Error(
          'VALIDATION_ERROR: Pipeline stage does not belong to the selected pipeline.'
        );
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
        description: 'Lead created',
      },
    });

    return lead;
  });

  await publishDomainEvent({
    eventId: crypto.randomUUID(),
    organizationId: organization.id,
    leadId: lead.id,
    type: 'LEAD_CREATED',
    metadata: {
      status: lead.status,
      source: lead.source,
      score: lead.score,
      intent: lead.intent,
    },
  });

  return lead;
}

export async function getLead(slug: string, leadId: string) {
  const { organization } = await requireOrganizationMember(slug);

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: organization.id,
      deletedAt: null,
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
        orderBy: { createdAt: 'desc' },
        include: {
          user: { include: { user: true } },
        },
      },
      aiAssessments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!lead) {
    throw new Error('NOT_FOUND');
  }

  return lead;
}

export async function listLeads(slug: string, queryParams: Record<string, unknown>) {
  const { organization } = await requireOrganizationMember(slug);
  const { page, limit } = paginationSchema.parse(queryParams);
  const skip = (page - 1) * limit;

  const whereClause: Prisma.LeadWhereInput = {
    organizationId: organization.id,
    deletedAt: null,
  };

  if (typeof queryParams.status === 'string') whereClause.status = queryParams.status as LeadStatus;
  if (typeof queryParams.source === 'string') whereClause.source = queryParams.source;
  if (typeof queryParams.assignedUserId === 'string')
    whereClause.assignedUserId = queryParams.assignedUserId;
  if (typeof queryParams.pipelineStageId === 'string')
    whereClause.pipelineStageId = queryParams.pipelineStageId;

  if (typeof queryParams.search === 'string' && queryParams.search) {
    whereClause.contact = {
      OR: [
        { firstName: { contains: queryParams.search, mode: 'insensitive' } },
        { lastName: { contains: queryParams.search, mode: 'insensitive' } },
        { email: { contains: queryParams.search, mode: 'insensitive' } },
        { phone: { contains: queryParams.search, mode: 'insensitive' } },
      ],
    };
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        contact: true,
        assignedUser: { include: { user: true } },
        pipelineStage: true,
        aiAssessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
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

  const lead = await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findFirst({
      where: { id: validated.id, organizationId: organization.id },
    });

    if (!existingLead) throw new Error('NOT_FOUND');

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
        description: 'Lead details updated',
      },
    });

    return lead;
  });

  await publishDomainEvent({
    eventId: crypto.randomUUID(),
    organizationId: organization.id,
    leadId: lead.id,
    type: 'LEAD_UPDATED',
    metadata: {
      score: lead.score,
      intent: lead.intent,
      budget: lead.budget,
      timeline: lead.timeline,
    },
  });

  return lead;
}

export async function assignLead(slug: string, leadId: string, assignedUserId: string | null) {
  const { organization, membership } = await requireOrganizationMember(slug);

  return await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findFirst({
      where: { id: leadId, organizationId: organization.id },
    });

    if (!existingLead) throw new Error('NOT_FOUND');

    if (assignedUserId) {
      const agentMembership = await tx.organizationMembership.findUnique({
        where: { id: assignedUserId },
      });
      if (!agentMembership || agentMembership.organizationId !== organization.id) {
        throw new Error('VALIDATION_ERROR: Assigned user is not valid for this organization.');
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
        description: assignedUserId ? 'Lead assigned to agent' : 'Lead unassigned',
      },
    });

    return lead;
  });
}

export async function changeLeadStage(slug: string, leadId: string, pipelineStageId: string) {
  const { organization, membership } = await requireOrganizationMember(slug);

  const result = await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findFirst({
      where: { id: leadId, organizationId: organization.id },
    });

    if (!existingLead) throw new Error('NOT_FOUND');

    const stage = await tx.pipelineStage.findUnique({
      where: { id: pipelineStageId },
    });

    if (!stage || stage.organizationId !== organization.id) {
      throw new Error('VALIDATION_ERROR: Pipeline stage is not valid for this organization.');
    }

    if (existingLead.pipelineId && stage.pipelineId !== existingLead.pipelineId) {
      throw new Error(
        "VALIDATION_ERROR: Pipeline stage does not belong to the lead's current pipeline."
      );
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

    return { lead, stageName: stage.name };
  });

  await publishDomainEvent({
    eventId: crypto.randomUUID(),
    organizationId: organization.id,
    leadId: result.lead.id,
    type: 'LEAD_STAGE_CHANGED',
    metadata: {
      pipelineStageId,
      stageName: result.stageName,
    },
  });

  return result.lead;
}

export async function updateLeadStatus(slug: string, leadId: string, status: LeadStatus) {
  const { organization, membership } = await requireOrganizationMember(slug);

  const existingLead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: organization.id, deletedAt: null },
  });

  if (!existingLead) throw new Error('NOT_FOUND');

  // Validate state transition invariant
  validateLeadStatusTransition(existingLead.status, status);

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { status },
  });

  await prisma.leadActivity.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      userId: membership.id,
      type: LeadActivityType.STATUS_CHANGED,
      description: `Status changed to ${status}`,
    },
  });

  // Record audit log
  await recordAuditLog({
    organizationId: organization.id,
    userId: membership.userId,
    action: 'LEAD_STATUS_UPDATED',
    entityType: 'Lead',
    entityId: lead.id,
    changes: { previousStatus: existingLead.status, newStatus: status },
  });

  await publishDomainEvent({
    eventId: crypto.randomUUID(),
    organizationId: organization.id,
    leadId: lead.id,
    type: 'LEAD_UPDATED',
    metadata: {
      status: lead.status,
      previousStatus: existingLead.status,
    },
  });

  return lead;
}

export async function softDeleteLead(slug: string, leadId: string) {
  const { organization, membership } = await requireOrganizationMember(slug);

  const existingLead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: organization.id, deletedAt: null },
  });

  if (!existingLead) throw new Error('NOT_FOUND');

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      deletedAt: new Date(),
      deletedById: membership.userId,
    },
  });

  await prisma.leadActivity.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      userId: membership.id,
      type: LeadActivityType.UPDATED,
      description: 'Lead soft-deleted and archived',
    },
  });

  await recordAuditLog({
    organizationId: organization.id,
    userId: membership.userId,
    action: 'LEAD_SOFT_DELETED',
    entityType: 'Lead',
    entityId: lead.id,
  });

  return lead;
}

export async function restoreLead(slug: string, leadId: string) {
  const { organization, membership } = await requireOrganizationMember(slug);

  const existingLead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: organization.id, deletedAt: { not: null } },
  });

  if (!existingLead) throw new Error('NOT_FOUND');

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      deletedAt: null,
      deletedById: null,
    },
  });

  await prisma.leadActivity.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      userId: membership.id,
      type: LeadActivityType.UPDATED,
      description: 'Lead restored from archive',
    },
  });

  await recordAuditLog({
    organizationId: organization.id,
    userId: membership.userId,
    action: 'LEAD_RESTORED',
    entityType: 'Lead',
    entityId: lead.id,
  });

  return lead;
}

