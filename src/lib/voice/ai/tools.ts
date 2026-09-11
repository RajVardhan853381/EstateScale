import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Tools the Voice Agent can invoke securely
export const voiceTools = {
    updateLeadStatus: {
        description: "Updates the CRM status of the lead.",
        parameters: z.object({
            status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "APPOINTMENT_BOOKED", "CLOSED_WON", "CLOSED_LOST"])
        }),
        execute: async ({ status }: { status: "NEW" | "CONTACTED" | "QUALIFIED" | "APPOINTMENT_BOOKED" | "CLOSED_WON" | "CLOSED_LOST" }, context: { organizationId: string, leadId: string }) => {
            await prisma.lead.update({
                where: { id: context.leadId, organizationId: context.organizationId },
                data: { status }
            });
            return `Lead status successfully updated to ${status}`;
        }
    },
    addLeadNote: {
        description: "Adds a plain text note to the lead's CRM profile to log important details discovered on the call.",
        parameters: z.object({
            note: z.string()
        }),
        execute: async ({ note }: { note: string }, context: { organizationId: string, leadId: string }) => {
            await prisma.note.create({
                data: {
                    organizationId: context.organizationId,
                    leadId: context.leadId,
                    content: note,
                }
            });
            return "Note added successfully.";
        }
    }
};

export async function authorizeTools(agentId: string, organizationId: string): Promise<string[]> {
    const agent = await prisma.voiceAgent.findUnique({
        where: { id: agentId, organizationId }
    });

    if (!agent || !agent.allowedTools) return [];

    return Array.isArray(agent.allowedTools) ? agent.allowedTools as string[] : [];
}
