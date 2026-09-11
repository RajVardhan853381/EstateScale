import { prisma } from "../prisma";
import { CommunicationProvider } from "../communication/provider";
import { TwilioProvider, MockCommunicationProvider } from "../communication/twilio";

const getProvider = (): CommunicationProvider => {
    if (process.env.NODE_ENV === "test" || !process.env.TWILIO_ACCOUNT_SID) {
        return new MockCommunicationProvider();
    }
    return new TwilioProvider();
};

export async function executeSendSms(
    organizationId: string,
    leadId: string,
    body: string,
    existingMessageId?: string
) {
    const orgConfig = await prisma.organizationCommunicationConfig.findFirst({
        where: { organizationId, isActive: true }
    });

    const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        include: { contact: true }
    });

    if (!orgConfig || !lead || !lead.contact?.phone) {
        throw new Error("Missing configuration or lead phone number.");
    }

    let conversation = await prisma.conversation.findFirst({
        where: { organizationId, leadId }
    });

    if (!conversation) {
        conversation = await prisma.conversation.create({
            data: {
                organizationId,
                leadId,
                contactId: lead.contactId || lead.id,
                channel: "SMS"
            }
        });
    }

    if (conversation.status === "OPT_OUT") {
        throw new Error("Cannot send SMS. Lead has opted out.");
    }

    let messageId = existingMessageId || "";

    if (!messageId) {
        // Automation flow: create a new message record because one wasn't queued in the UI
        const message = await prisma.message.create({
            data: {
                organizationId,
                conversationId: conversation.id,
                direction: "OUTBOUND",
                status: "SENDING",
                body,
                from: orgConfig.phoneNumber,
                to: lead.contact.phone
            }
        });
        messageId = message.id;
    } else {
        // Manual flow: update the existing QUEUED message
        await prisma.message.update({
            where: { id: messageId, organizationId },
            data: { status: "SENDING", from: orgConfig.phoneNumber }
        });
    }

    const provider = getProvider();
    const result = await provider.sendSms(
        lead.contact.phone,
        orgConfig.phoneNumber,
        body,
        organizationId
    );

    if (result.success) {
        await prisma.message.update({
            where: { id: messageId, organizationId },
            data: { status: "SENT", externalId: result.externalId }
        });
    } else {
        await prisma.message.update({
            where: { id: messageId, organizationId },
            data: { status: "FAILED", error: result.error }
        });

        if (result.error === "OPT_OUT") {
             await prisma.conversation.update({
                 where: { id: conversation.id, organizationId },
                 data: { status: "OPT_OUT" }
             });
        }
        throw new Error(`SMS Provider Error: ${result.error}`);
    }
}
