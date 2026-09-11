export interface CommunicationProvider {
    sendSms(to: string, from: string, body: string, organizationId: string): Promise<SendSmsResult>;
}

export type SendSmsResult = {
    success: boolean;
    externalId?: string; // e.g. Twilio SID
    error?: string;
};
