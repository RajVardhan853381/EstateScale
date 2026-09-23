'use server';

import { createLead, updateLeadStatus, softDeleteLead, restoreLead } from '@/lib/services/leads';
import { createContact } from '@/lib/services/contacts';
import { createNote } from '@/lib/services/notes';
import { LeadStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createLeadAction(
  slug: string,
  payload: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    budget?: number;
    propertyType?: string;
    location?: string;
    timeline?: string;
    status?: LeadStatus;
    notesText?: string;
  }
) {
  try {
    const lead = await createLead(slug, {
      contact: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email || undefined,
        phone: payload.phone || undefined,
      },
      budget: payload.budget ? Number(payload.budget) : undefined,
      propertyType: payload.propertyType || undefined,
      location: payload.location || undefined,
      timeline: payload.timeline || undefined,
      status: payload.status || LeadStatus.NEW,
      notesText: payload.notesText || undefined,
    });

    revalidatePath(`/org/${slug}/leads`);
    revalidatePath(`/org/${slug}/dashboard`);
    return { success: true, leadId: lead.id };
  } catch (error: unknown) {
    console.error('Failed to create lead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create lead',
    };
  }
}

export async function createContactAction(
  slug: string,
  payload: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }
) {
  try {
    const contact = await createContact(slug, {
      firstName: payload.firstName || undefined,
      lastName: payload.lastName || undefined,
      email: payload.email || undefined,
      phone: payload.phone || undefined,
    });

    revalidatePath(`/org/${slug}/contacts`);
    return { success: true, contactId: contact.id };
  } catch (error: unknown) {
    console.error('Failed to create contact:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create contact',
    };
  }
}

export async function updateLeadStatusAction(
  slug: string,
  leadId: string,
  status: LeadStatus
) {
  try {
    await updateLeadStatus(slug, leadId, status);
    revalidatePath(`/org/${slug}/leads`);
    revalidatePath(`/org/${slug}/leads/${leadId}`);
    revalidatePath(`/org/${slug}/dashboard`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to update lead status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update lead status',
    };
  }
}

export async function addLeadNoteAction(
  slug: string,
  leadId: string,
  content: string
) {
  try {
    await createNote(slug, leadId, { content });
    revalidatePath(`/org/${slug}/leads/${leadId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to add note:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add note',
    };
  }
}

export async function softDeleteLeadAction(slug: string, leadId: string) {
  try {
    await softDeleteLead(slug, leadId);
    revalidatePath(`/org/${slug}/leads`);
    revalidatePath(`/org/${slug}/dashboard`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to soft delete lead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete lead',
    };
  }
}

export async function restoreLeadAction(slug: string, leadId: string) {
  try {
    await restoreLead(slug, leadId);
    revalidatePath(`/org/${slug}/leads`);
    revalidatePath(`/org/${slug}/dashboard`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to restore lead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore lead',
    };
  }
}
