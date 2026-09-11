import twilio from "twilio";

export class TwilioVoiceProvider {
    /**
     * Triggers an outbound call using Twilio Voice API.
     * The `url` is the Webhook Twilio should fetch when the call connects to receive TwiML instructions.
     */
    static async makeOutboundCall(toPhoneNumber: string, webhookUrl: string, statusCallbackUrl: string) {
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        const accountSid = process.env.TWILIO_ACCOUNT_SID || "AC_DUMMY";
        const authToken = process.env.TWILIO_AUTH_TOKEN || "DUMMY";
        const client = twilio(accountSid, authToken);

        if (!twilioPhoneNumber) {
            throw new Error("Twilio Sender Number is not configured.");
        }

        const call = await client.calls.create({
            to: toPhoneNumber,
            from: twilioPhoneNumber,
            url: webhookUrl,
            statusCallback: statusCallbackUrl,
            statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer', 'canceled'],
            statusCallbackMethod: 'POST',
        });

        return call;
    }
}
