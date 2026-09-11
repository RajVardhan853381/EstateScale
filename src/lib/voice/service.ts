import { prisma } from "@/lib/prisma";
import { TwilioVoiceProvider } from "./twilio";
import { enqueueAutomationJob } from "@/lib/queue/producer";

export class VoiceService {
    static async getAgent(organizationId: string, agentId?: string) {
        if (agentId) {
            return prisma.voiceAgent.findFirst({
                where: { id: agentId, organizationId }
            });
        }

        return prisma.voiceAgent.findFirst({
            where: { organizationId, enabled: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async queueOutboundCall(organizationId: string, leadId: string, agentId?: string) {
        const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            include: { subscription: true }
        });

        if (!org || org.subscription?.status === "PAST_DUE") {
            throw new Error("Voice calling disabled: Past due or invalid organization.");
        }

        const agent = await this.getAgent(organizationId, agentId);
        if (!agent) {
             throw new Error("No active Voice Agent configured.");
        }

        const lead = await prisma.lead.findFirst({
            where: { id: leadId, organizationId },
            include: { contact: true }
        });

        if (!lead || !lead.contact?.phone) {
             throw new Error("Lead has no valid phone number.");
        }

        // We use providerCallId to track before Twilio assigns one
        const internalId = `outbound-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        const voiceCall = await prisma.voiceCall.create({
            data: {
                organizationId,
                leadId,
                agentId: agent.id,
                direction: "OUTBOUND",
                status: "QUEUED",
                providerCallId: internalId
            }
        });

        await enqueueAutomationJob({
             organizationId,
             leadId,
             actionType: "VOICE_OUTBOUND_CALL",
             agentId: agent.id,
             callId: voiceCall.id,
             eventId: internalId
        });

        return voiceCall;
    }
}
