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
