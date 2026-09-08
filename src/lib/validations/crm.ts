import { z } from 'zod';
import { LeadStatus } from '@prisma/client';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const contactBaseSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().max(255).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
});

export const contactSchema = contactBaseSchema.refine(data => data.email || data.phone || (data.firstName && data.lastName), {
  message: "Contact must have either an email, phone, or both first and last name.",
});

const leadBaseSchema = z.object({
  contactId: z.string().cuid().optional(),
  contact: contactSchema.optional(), // Can create inline
  assignedUserId: z.string().cuid().optional().nullable(),
  pipelineId: z.string().cuid().optional(),
  pipelineStageId: z.string().cuid().optional(),

  source: z.enum(['WEBSITE', 'MANUAL', 'FACEBOOK', 'INSTAGRAM', 'REFERRAL', 'PHONE', 'OTHER']).optional().default('MANUAL'),
  status: z.nativeEnum(LeadStatus).optional().default(LeadStatus.NEW),
  score: z.number().int().min(0).max(100).optional(),
  intent: z.string().max(100).optional(),
  budget: z.number().positive().optional(),
  location: z.string().max(255).optional(),
  propertyType: z.string().max(100).optional(),
  timeline: z.string().max(100).optional(),

  notesText: z.string().max(5000).optional(),
});

export const leadSchema = leadBaseSchema.refine(data => data.contactId || data.contact, {
  message: "Either an existing contactId or new contact details must be provided.",
});

export const updateLeadSchema = leadBaseSchema.partial().extend({
  id: z.string().cuid(),
});

export const tagSchema = z.object({
  name: z.string().min(1).max(50),
});

export const noteSchema = z.object({
  content: z.string().min(1).max(5000),
});
