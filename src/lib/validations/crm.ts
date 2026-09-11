import { z } from "zod";
import { LeadStatus } from "@prisma/client";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const contactSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
}).refine(data => data.email || data.phone || (data.firstName && data.lastName), {
  message: "Must provide at least email, phone, or full name",
});

export const leadBaseSchema = z.object({
  contactId: z.string().optional(), // if linking to existing
  contact: contactSchema.optional(), // if creating new
  assignedUserId: z.string().optional(),
  pipelineId: z.string().optional(),
  pipelineStageId: z.string().optional(),
  source: z.string().max(50).optional(),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  score: z.number().int().min(0).max(100).optional(),
  intent: z.string().max(50).optional(),
  budget: z.number().positive().optional(),
  location: z.string().max(255).optional(),
  propertyType: z.string().max(100).optional(),
  timeline: z.string().max(100).optional(),
  notesText: z.string().optional(),
});

export const leadSchema = leadBaseSchema.refine(data => data.contactId || data.contact, {
  message: "Must provide either contactId or new contact details",
});

export const updateLeadSchema = leadBaseSchema.partial().extend({
  id: z.string(),
});

export const noteSchema = z.object({
  content: z.string().min(1, "Note content cannot be empty").max(10000),
});

export const tagSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\-_]+$/, "Tag name can only contain alphanumeric characters, hyphens, and underscores"),
});

export const pipelineStageSchema = z.object({
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
});

export const pipelineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  stages: z.array(pipelineStageSchema).optional(),
});
