"use server";

import { requireOrganizationMember } from "@/lib/auth/authorization";
import { publishDomainEvent } from "@/lib/events/bus";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function requestAiAnalysis(slug: string, leadId: string) {
    try {
        const { organization } = await requireOrganizationMember(slug);

        // Verify the lead belongs to the org
        const lead = await prisma.lead.findFirst({
            where: { id: leadId, organizationId: organization.id }
        });

        if (!lead) throw new Error("Lead not found");

        await publishDomainEvent({
            eventId: crypto.randomUUID(),
            type: "AI_ANALYSIS_COMPLETED",
            organizationId: organization.id,
            leadId: lead.id
        });

        return { success: true };
    } catch (error: unknown) {
        console.error("AI Analysis enqueue failed", error);
        return { success: false, error: (error as Error).message };
    }
}
