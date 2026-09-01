"use server";

import { requireOrganizationMember } from "@/lib/auth/authorization";
import { publishDomainEvent } from "@/lib/events/bus";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Server action mapping user intent onto the asynchronous queue system
export async function triggerLeadAnalysis(slug: string, leadId: string) {
    try {
        const { organization } = await requireOrganizationMember(slug);

        const lead = await prisma.lead.findFirst({
            where: { id: leadId, organizationId: organization.id }
        });

        if (!lead) throw new Error("Validation Failure: Lead not found.");

        // Instead of running AI locally freezing the request, dispatch to the automation queue directly.
        await publishDomainEvent({
            type: "AI_ANALYSIS_COMPLETED", // Using an explicit trigger here for manual analysis tests
            organizationId: organization.id,
            leadId: lead.id
        });

        // This path revalidation won't immediately reflect AI assessment due to async worker latency
        // The UI handles this via loading states or subsequent page reloads/polling natively.
        revalidatePath(`/org/${slug}/leads/${leadId}`);
        return { success: true, message: "Analysis job queued successfully." };
    } catch (error: unknown) {
        console.error("AI Analysis enqueue failed:", error instanceof Error ? error.message : "Unknown error");
        return { success: false, error: "Failed to queue lead for analysis." };
    }
}
