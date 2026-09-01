import { prisma } from "@/lib/prisma";
import { noteSchema } from "@/lib/validations/crm";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { LeadActivityType } from "@prisma/client";

export async function createNote(slug: string, leadId: string, data: unknown) {
  const { organization, membership } = await requireOrganizationMember(slug);
  const validated = noteSchema.parse(data);

  return await prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findFirst({
        where: { id: leadId, organizationId: organization.id }
    });

    if (!existingLead) throw new Error("NOT_FOUND");

    const note = await tx.note.create({
      data: {
        organizationId: organization.id,
        leadId,
        userId: membership.id,
        content: validated.content,
      },
      include: {
         user: { include: { user: true } }
      }
    });

    await tx.leadActivity.create({
      data: {
        organizationId: organization.id,
        leadId,
        userId: membership.id,
        type: LeadActivityType.NOTE_ADDED,
        description: "Added a note",
      },
    });

    return note;
  });
}

export async function listNotes(slug: string, leadId: string) {
  const { organization } = await requireOrganizationMember(slug);

  const existingLead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: organization.id }
  });

  if (!existingLead) throw new Error("NOT_FOUND");

  return prisma.note.findMany({
    where: {
      organizationId: organization.id,
      leadId,
    },
    orderBy: { createdAt: "desc" },
    include: {
        user: { include: { user: true } }
    }
  });
}

export async function updateNote(slug: string, noteId: string, data: unknown) {
    const { organization, membership } = await requireOrganizationMember(slug);
    const validated = noteSchema.parse(data);

    const existingNote = await prisma.note.findFirst({
        where: { id: noteId, organizationId: organization.id, userId: membership.id } // Only creator can update
    });

    if (!existingNote) throw new Error("NOT_FOUND");

    return prisma.note.update({
        where: { id: noteId },
        data: {
            content: validated.content,
        },
        include: {
            user: { include: { user: true } }
        }
    });
}

export async function deleteNote(slug: string, noteId: string) {
    const { organization, membership } = await requireOrganizationMember(slug);

    const existingNote = await prisma.note.findFirst({
        where: { id: noteId, organizationId: organization.id, userId: membership.id }
    });

    if (!existingNote) throw new Error("NOT_FOUND");

    await prisma.note.delete({
        where: { id: noteId }
    });
}
