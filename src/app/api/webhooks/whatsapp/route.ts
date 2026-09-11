import { NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const url = new URL(req.url);
        const host = req.headers.get("host");
        const protocol = req.headers.get("x-forwarded-proto") || "https";
        const fullUrl = `${protocol}://${host}${url.pathname}${url.search}`;

        const formData = await req.formData();
        const data: Record<string, string> = {};
        formData.forEach((val, key) => { data[key] = val.toString(); });

        const signature = req.headers.get("x-twilio-signature");
        if (process.env.NODE_ENV === "production" && signature) {
            const isValid = twilio.validateRequest(
                process.env.TWILIO_AUTH_TOKEN || "",
                signature,
                fullUrl,
                data
            );
            if (!isValid) {
                return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
            }
        }

        const toWhatsApp = data.To; // Expected 'whatsapp:+1234...'
        const fromWhatsApp = data.From;
        const body = data.Body;
        const messageSid = data.MessageSid;

        if (!toWhatsApp || !fromWhatsApp || !messageSid) {
            return NextResponse.json({ error: "Missing required Twilio parameters" }, { status: 400 });
        }

        // 1. Identify Tenant
        const config = await prisma.organizationCommunicationConfig.findFirst({
            where: { phoneNumber: toWhatsApp.replace("whatsapp:", ""), isActive: true },
            include: { organization: { include: { subscription: true } } }
        });

        if (!config || config.organization.subscription?.status === "PAST_DUE") {
             return NextResponse.json({ received: true });
        }

        const organizationId = config.organizationId;

        // 2. Identify Lead
        const callerPhone = fromWhatsApp.replace("whatsapp:", "");
        let contact = await prisma.contact.findFirst({
            where: { organizationId, phone: callerPhone }
        });

        let leadId: string | undefined;

        if (!contact) {
            // Unsolicited WhatsApp inbound (Create Lead context if needed)
            contact = await prisma.contact.create({
                 data: { organizationId, phone: callerPhone, firstName: data.ProfileName || "Unknown" }
            });
            const newLead = await prisma.lead.create({
                 data: { organizationId, contactId: contact.id, source: "WhatsApp Inbound" }
            });
            leadId = newLead.id;
        } else {
            const lead = await prisma.lead.findFirst({
                where: { organizationId, contactId: contact.id },
                orderBy: { createdAt: "desc" }
            });
            if (lead) leadId = lead.id;
        }

        // 3. Thread the Conversation
        let conversation = await prisma.conversation.findFirst({
            where: { organizationId, contactId: contact.id, channel: "WHATSAPP" }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: { organizationId, leadId, contactId: contact.id, channel: "WHATSAPP" }
            });
        }

        if (conversation.status === "OPT_OUT" && body.toLowerCase() !== "start") {
             return NextResponse.json({ received: true });
        }

        // 4. Handle Opt-outs/Opt-ins explicitly
        if (body.toLowerCase() === "stop") {
             await prisma.conversation.update({
                  where: { id: conversation.id },
                  data: { status: "OPT_OUT" }
             });
        }

        // 5. Idempotent Inbound Message insertion
        await prisma.message.upsert({
            where: { organizationId_externalId: { organizationId, externalId: messageSid } },
            create: {
                organizationId,
                conversationId: conversation.id,
                direction: "INBOUND",
                status: "RECEIVED",
                body,
                from: fromWhatsApp,
                to: toWhatsApp,
                externalId: messageSid,
                channel: "WHATSAPP",
                provider: "TWILIO_WHATSAPP"
            },
            update: {
                status: "RECEIVED"
            }
        });

        return NextResponse.json({ received: true });
    } catch (error: unknown) {
        console.error("WhatsApp Inbound Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
