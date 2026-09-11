import twilio from "twilio";
import { CommunicationProvider, SendSmsResult } from "./provider";

export class TwilioProvider implements CommunicationProvider {
    private client: twilio.Twilio;

    constructor() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID || "AC_DUMMY";
        const authToken = process.env.TWILIO_AUTH_TOKEN || "DUMMY";

        if (accountSid === "AC_DUMMY" && process.env.NODE_ENV !== "test") {
            console.warn("TWILIO_ACCOUNT_SID not set; TwilioProvider will fail in production.");
        }

        this.client = twilio(accountSid, authToken);
    }

    async sendSms(to: string, from: string, body: string, organizationId: string): Promise<SendSmsResult> {
        try {
            // We append organization metadata dynamically letting webhooks map callbacks backwards deterministically
            const statusCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'}/api/webhooks/twilio/status?org=${organizationId}`;

            const message = await this.client.messages.create({
                body,
                from,
                to,
                statusCallback: statusCallbackUrl
            });

            return {
                success: true,
                externalId: message.sid
            };
        } catch (error: unknown) {
            console.error("[TwilioProvider] Send failed:", error);

            // Capture specific carrier opt-out violation codes preventing repeated spam natively
            if ((error as { code?: number }).code === 21610) {
                return { success: false, error: "OPT_OUT" };
            }

            return {
                success: false,
                error: (error as Error).message || "Unknown Provider Error"
            };
        }
    }
}

export class MockCommunicationProvider implements CommunicationProvider {
    async sendSms(to: string, _from: string, body: string, _org: string): Promise<SendSmsResult> {
        console.log(`[MockProvider] Sending SMS to ${to}: ${body}`);
        return { success: true, externalId: `mock_${Date.now()}` };
    }
}
