"use server";

import { requireOrganizationMember } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { enqueueAutomationJob } from "@/lib/queue/producer";
import crypto from "crypto";

export async function triggerSmsSend(slug: string, leadId: string, body: string) {
    try {
        const { organization } = await requireOrganizationMember(slug);

        const lead = await prisma.lead.findFirst({
            where: { id: leadId, organizationId: organization.id },
            include: { contact: true }
        });

        if (!lead || !lead.contact?.phone) {
            throw new Error("Validation Failure: Lead or phone number not found.");
        }

        const conversation = await prisma.conversation.findFirst({
            where: { organizationId: organization.id, leadId: lead.id }
        }) || await prisma.conversation.create({
            data: {
                organizationId: organization.id,
                leadId: lead.id,
                contactId: lead.contactId || lead.id, // Fallback safely
                channel: "SMS",
                status: "ACTIVE"
            }
        });

        if (conversation.status === "OPT_OUT") {
            throw new Error("Lead has opted out of communications.");
        }

        // We explicitly persist the queued message state synchronously with exact drafted content
        const message = await prisma.message.create({
            data: {
                organizationId: organization.id,
                conversationId: conversation.id,
                direction: "OUTBOUND",
                status: "QUEUED",
                provider: "TWILIO",
                from: "PENDING",
                to: lead.contact.phone,
                body
            }
        });

        // Enqueue explicit MANUAL_SMS to avoid triggering AutomationExecution side-effects
        await enqueueAutomationJob({
            actionType: "MANUAL_SMS",
            organizationId: organization.id,
            leadId: lead.id,
            messageId: message.id,
            eventId: crypto.randomUUID()
        });

        revalidatePath(`/org/${slug}/leads/${leadId}`);
        return { success: true };
    } catch (error: unknown) {
        console.error("SMS enqueue failed:", error instanceof Error ? error.message : "Unknown error");
        return { success: false, error: error instanceof Error ? error.message : "Failed to send message." };
    }
}
