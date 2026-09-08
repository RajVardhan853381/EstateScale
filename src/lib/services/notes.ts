import { prisma } from '@/lib/prisma';
import { noteSchema } from '@/lib/validations/crm';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { LeadActivityType } from '@prisma/client';

export async function createNote(slug: string, leadId: string, data: unknown) {
  const { organization, membership } = await requireOrganizationMember(slug);
  const validated = noteSchema.parse(data);

  return await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({
      where: { id: leadId, organizationId: organization.id },
    });

    if (!lead) throw new Error('NOT_FOUND');

    const note = await tx.note.create({
      data: {
        organizationId: organization.id,
        leadId,
        userId: membership.id,
        content: validated.content,
      },
    });

    await tx.leadActivity.create({
      data: {
        organizationId: organization.id,
        leadId,
        userId: membership.id,
        type: LeadActivityType.NOTE_ADDED,
        description: 'Note added to lead',
      },
    });

    return note;
  });
}

export async function listNotes(slug: string, leadId: string) {
  const { organization } = await requireOrganizationMember(slug);

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: organization.id },
  });

  if (!lead) throw new Error('NOT_FOUND');

  return prisma.note.findMany({
    where: {
      organizationId: organization.id,
      leadId,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { include: { user: true } },
    },
  });
}

export async function updateNote(slug: string, noteId: string, data: unknown) {
  const { organization, membership } = await requireOrganizationMember(slug);
  const validated = noteSchema.parse(data);

  const existingNote = await prisma.note.findFirst({
    where: { id: noteId, organizationId: organization.id },
  });

  if (!existingNote) throw new Error('NOT_FOUND');
  if (existingNote.userId !== membership.id && membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }

  return prisma.note.update({
    where: { id: noteId },
    data: { content: validated.content },
  });
}

export async function deleteNote(slug: string, noteId: string) {
  const { organization, membership } = await requireOrganizationMember(slug);

  const existingNote = await prisma.note.findFirst({
    where: { id: noteId, organizationId: organization.id },
  });

  if (!existingNote) throw new Error('NOT_FOUND');
  if (existingNote.userId !== membership.id && membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }

  return prisma.note.delete({
    where: { id: noteId },
  });
}
