import { NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/lib/events/bus";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const signature = req.headers.get("x-twilio-signature");
        const url = req.url;

        // Next.js consumes the raw body differently, we must parse application/x-www-form-urlencoded
        const bodyText = await req.text();
        const params = new URLSearchParams(bodyText);
        const data = Object.fromEntries(params.entries());

        if (process.env.NODE_ENV !== "test") {
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            if (!authToken) throw new Error("Missing TWILIO_AUTH_TOKEN");
            if (!signature || !twilio.validateRequest(authToken, signature, url, data)) {
                return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
            }
        }

        const toPhone = data.To;
        const fromPhone = data.From;
        const body = data.Body;
        const externalId = data.MessageSid;

        // Resolve Tenant
        const config = await prisma.organizationCommunicationConfig.findFirst({
            where: { phoneNumber: toPhone, isActive: true },
            include: { organization: true }
        });

        if (!config) {
            return NextResponse.json({ error: "No organization config found" }, { status: 404 });
        }

        const organizationId = config.organizationId;

        // Resolve Contact natively safely inside boundary
        let contact = await prisma.contact.findFirst({
            where: { organizationId, phone: fromPhone }
        });

        if (!contact) {
            contact = await prisma.contact.create({
                data: { organizationId, phone: fromPhone, firstName: "Unknown" }
            });
        }

        // Check for Lead
        const lead = await prisma.lead.findFirst({
            where: { organizationId, contactId: contact.id }
        });

        // Resolve Conversation Thread
        let conversation = await prisma.conversation.findFirst({
            where: { organizationId, contactId: contact.id }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: { organizationId, contactId: contact.id, leadId: lead?.id, channel: "SMS" }
            });
        }

        // Handle native TCPA Opt-out payloads without AI invocation
        const normalizedBody = body.trim().toLowerCase();
        if (normalizedBody === "stop" || normalizedBody === "unsubscribe") {
            await prisma.conversation.update({
                where: { id: conversation.id, organizationId },
                data: { status: "OPT_OUT" }
            });
        }

        // Create the received record
        await prisma.message.create({
            data: {
                organizationId,
                conversationId: conversation.id,
                direction: "INBOUND",
                status: "RECEIVED",
                provider: "TWILIO",
                body,
                from: fromPhone,
                to: toPhone,
                externalId
            }
        });

        // Create CRM Activity
        if (lead) {
            await prisma.leadActivity.create({
                data: {
                    organizationId,
                    leadId: lead.id,
                    type: "CONTACTED",
                    description: `SMS Received: ${body}`
                }
            });

            // Plumb through event bus for Phase 4 automation loops seamlessly
            await publishDomainEvent({
                eventId: crypto.randomUUID(),
                organizationId,
                leadId: lead.id,
                type: "MESSAGE_RECEIVED"
            });
        }

        // Return TwiML
        const twiml = new twilio.twiml.MessagingResponse();
        return new NextResponse(twiml.toString(), {
            headers: { "Content-Type": "text/xml" }
        });
    } catch (error) {
        console.error("[Twilio SMS Webhook Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
