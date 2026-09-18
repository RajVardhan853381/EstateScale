import { NextResponse } from "next/server";
import twilio from "twilio";
import { handleInboundSms } from "@/lib/services/communication";

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

        try {
            await handleInboundSms(toPhone, fromPhone, body, externalId);
        } catch (error: any) {
            if (error.message === "No organization config found") {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }
            throw error; // Re-throw for 500
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
