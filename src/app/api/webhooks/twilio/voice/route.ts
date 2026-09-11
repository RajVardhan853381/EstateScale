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

        const toPhone = data.To;
        const fromPhone = data.From;
        const callSid = data.CallSid;

        if (!toPhone || !fromPhone || !callSid) {
            return NextResponse.json({ error: "Missing required Twilio parameters" }, { status: 400 });
        }

        // 1. Identify Tenant by the To number (Assuming dedicated numbers per org)
        const config = await prisma.organizationCommunicationConfig.findFirst({
            where: { phoneNumber: toPhone, isActive: true },
            include: { organization: { include: { subscription: true } } }
        });

        if (!config || config.organization.subscription?.status === "PAST_DUE") {
            const response = new twilio.twiml.VoiceResponse();
            response.say("We're sorry, this number is currently unavailable.");
            return new NextResponse(response.toString(), {
                headers: { "Content-Type": "text/xml" }
            });
        }

        const organizationId = config.organizationId;

        // 2. Look for Lead
        const contact = await prisma.contact.findFirst({
            where: { organizationId, phone: fromPhone }
        });

        let leadId: string | undefined;

        if (contact) {
            const lead = await prisma.lead.findFirst({
                where: { organizationId, contactId: contact.id },
                orderBy: { createdAt: "desc" }
            });
            if (lead) leadId = lead.id;
        }

        // 3. Find Active Agent
        const agent = await prisma.voiceAgent.findFirst({
            where: { organizationId, enabled: true }
        });

        if (!agent) {
            const response = new twilio.twiml.VoiceResponse();
            response.say("This organization does not currently have a voice assistant configured.");
            return new NextResponse(response.toString(), {
                headers: { "Content-Type": "text/xml" }
            });
        }

        // 4. Log Call idempotently
        await prisma.voiceCall.upsert({
            where: { providerCallId: callSid },
            create: {
                organizationId,
                agentId: agent.id,
                leadId: leadId || null,
                providerCallId: callSid,
                direction: "INBOUND",
                status: "IN_PROGRESS"
            },
            update: {
                status: "IN_PROGRESS"
            }
        });

        // 5. Connect to AI streams. (In a real implementation, this streams to our WS)
        const response = new twilio.twiml.VoiceResponse();
        const connect = response.connect();

        // Use wss protocol for Media Streams
        connect.stream({
            url: `wss://${host}/api/webhooks/twilio/voice/stream`,
        });

        // We say a greeting before connecting
        response.say(agent.greeting || "Hello, how can I help you today?");

        return new NextResponse(response.toString(), {
            headers: { "Content-Type": "text/xml" }
        });

    } catch (error: unknown) {
        console.error("Twilio Voice Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
