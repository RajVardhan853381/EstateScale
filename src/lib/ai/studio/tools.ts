import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const studioTools = {
    searchLeads: {
        description: "Search for leads matching a query (e.g. status, name, intent). Useful to answer 'Show me my hot leads'.",
        parameters: z.object({
            query: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().default(5)
        }),
        execute: async ({ query, status, limit }: { query?: string, status?: string, limit: number }, context: { organizationId: string }) => {
            const leads = await prisma.lead.findMany({
                where: {
                    organizationId: context.organizationId,
                    status: (status as "NEW" | "CONTACTED" | "QUALIFIED" | "APPOINTMENT_BOOKED" | "CLOSED_WON" | "CLOSED_LOST") || undefined,
                    OR: query ? [
                        { contact: { firstName: { contains: query, mode: "insensitive" } } },
                        { intent: { contains: query, mode: "insensitive" } }
                    ] : undefined
                },
                take: limit,
                include: { contact: true }
            });
            return leads.map(l => ({
                id: l.id,
                name: `${l.contact?.firstName || ""} ${l.contact?.lastName || ""}`,
                status: l.status,
                score: l.score,
                intent: l.intent
            }));
        }
    },
    getPipelineSummary: {
        description: "Summarize the CRM pipeline.",
        parameters: z.object({}),
        execute: async (_args: Record<string, never>, context: { organizationId: string }) => {
            const counts = await prisma.lead.groupBy({
                by: ["status"],
                where: { organizationId: context.organizationId },
                _count: true
            });
            return counts.map(c => ({ status: c.status, count: c._count }));
        }
    },
    updateLeadStatus: {
        description: "Update a lead's status.",
        parameters: z.object({
            leadId: z.string(),
            status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "APPOINTMENT_BOOKED", "CLOSED_WON", "CLOSED_LOST"])
        }),
        execute: async ({ leadId, status }: { leadId: string, status: "NEW" | "CONTACTED" | "QUALIFIED" | "APPOINTMENT_BOOKED" | "CLOSED_WON" | "CLOSED_LOST" }, context: { organizationId: string }) => {
            await prisma.lead.update({
                where: { id: leadId, organizationId: context.organizationId },
                data: { status }
            });
            return { success: true, message: `Updated lead ${leadId} to ${status}` };
        }
    }
};

type StudioTool = {
    description: string;
    parameters: z.ZodType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: (args: any, context: { organizationId: string }) => Promise<unknown>;
};

export function getAuthorizedTools(allowedToolNames: string[]) {
    const tools: Record<string, StudioTool> = {};
    for (const name of allowedToolNames) {
        if (name in studioTools) {
            tools[name] = studioTools[name as keyof typeof studioTools];
        }
    }
    return tools;
}
