import twilio from "twilio";
import { CommunicationProvider, SendSmsResult } from "../provider";

export class TwilioWhatsAppProvider implements CommunicationProvider {
    private client: twilio.Twilio;

    constructor() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID || "AC_DUMMY";
        const authToken = process.env.TWILIO_AUTH_TOKEN || "DUMMY";
        this.client = twilio(accountSid, authToken);
    }

    async sendSms(to: string, from: string, body: string, organizationId: string): Promise<SendSmsResult> {
        return this.sendWhatsApp(to, from, body, organizationId);
    }

    async sendWhatsApp(to: string, from: string, body: string, organizationId: string): Promise<SendSmsResult> {
        try {
            // Twilio WhatsApp numbers require the "whatsapp:" prefix
            const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
            const formattedFrom = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

            const statusCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'}/api/webhooks/twilio/status?org=${organizationId}`;

            const message = await this.client.messages.create({
                body,
                from: formattedFrom,
                to: formattedTo,
                statusCallback: statusCallbackUrl
            });

            return {
                success: true,
                externalId: message.sid
            };
        } catch (error: unknown) {
            console.error("[TwilioWhatsAppProvider] Send failed:", error);
            return {
                success: false,
                error: (error as Error).message || "Unknown Provider Error"
            };
        }
    }
}
