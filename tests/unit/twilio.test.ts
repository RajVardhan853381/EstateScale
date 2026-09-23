import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TwilioProvider } from "../../src/lib/communication/twilio";

describe("TwilioProvider", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("throws an error if TWILIO_ACCOUNT_SID is missing", () => {
        delete process.env.TWILIO_ACCOUNT_SID;
        process.env.TWILIO_AUTH_TOKEN = "DUMMY";

        expect(() => new TwilioProvider()).toThrowError(
            "Missing Twilio credentials (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)."
        );
    });

    it("throws an error if TWILIO_AUTH_TOKEN is missing", () => {
        process.env.TWILIO_ACCOUNT_SID = "AC_DUMMY";
        delete process.env.TWILIO_AUTH_TOKEN;

        expect(() => new TwilioProvider()).toThrowError(
            "Missing Twilio credentials (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)."
        );
    });

    it("initializes successfully if both are present", () => {
        process.env.TWILIO_ACCOUNT_SID = "AC_DUMMY";
        process.env.TWILIO_AUTH_TOKEN = "DUMMY";

        expect(() => new TwilioProvider()).not.toThrowError();
    });
});

describe("Inbound SMS Idempotency & Webhook Security", () => {
    it("should deduplicate inbound messages if externalId already exists", async () => {
        vi.mock("../../src/lib/prisma", () => ({
            prisma: {
                organizationCommunicationConfig: {
                    findFirst: vi.fn().mockResolvedValue({
                        id: "config-1",
                        organizationId: "org-1",
                        phoneNumber: "+15551234567",
                        isActive: true,
                    }),
                },
                contact: {
                    findFirst: vi.fn().mockResolvedValue({ id: "contact-1", phone: "+15559876543" }),
                    create: vi.fn(),
                },
                lead: {
                    findFirst: vi.fn().mockResolvedValue({ id: "lead-1" }),
                },
                conversation: {
                    findFirst: vi.fn().mockResolvedValue({ id: "conv-1" }),
                    update: vi.fn(),
                },
                message: {
                    findFirst: vi.fn().mockResolvedValue({
                        id: "msg-existing-123",
                        organizationId: "org-1",
                        externalId: "SM_DUPLICATE_SID",
                        body: "Hello first time",
                    }),
                    create: vi.fn(),
                },
                leadActivity: {
                    create: vi.fn(),
                },
            },
        }));

        const { handleInboundSms } = await import("../../src/lib/services/communication");
        const { prisma } = await import("../../src/lib/prisma");

        const result = await handleInboundSms(
            "+15551234567",
            "+15559876543",
            "Hello second time retry",
            "SM_DUPLICATE_SID"
        );

        // Deduplication: Returns existing record
        expect(result).toBeDefined();
        expect(result?.id).toBe("msg-existing-123");
        // Crucial: message.create should NOT be called again
        expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it("should recover gracefully from P2002 unique constraint race condition during simultaneous retries", async () => {
        const { handleInboundSms } = await import("../../src/lib/services/communication");
        const { prisma } = await import("../../src/lib/prisma");

        // Simulate findFirst returning null on initial check (both concurrent requests see nothing)
        const existingRecord = {
            id: "msg-race-winner-456",
            organizationId: "org-1",
            externalId: "SM_RACE_SID",
            body: "Race payload",
        };

        // First findFirst returns null, second findFirst (inside catch) returns the winner
        (prisma.message.findFirst as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(existingRecord);

        // message.create throws P2002 unique constraint collision
        const p2002Error = new Error("Unique constraint failed on the fields: (`organizationId`,`externalId`)");
        (p2002Error as unknown as Record<string, unknown>).code = "P2002";
        (prisma.message.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(p2002Error);

        const result = await handleInboundSms(
            "+15551234567",
            "+15559876543",
            "Race payload",
            "SM_RACE_SID"
        );

        // Safely recovers and returns the winning record without 500 failure
        expect(result).toBeDefined();
        expect(result?.id).toBe("msg-race-winner-456");
    });
});
