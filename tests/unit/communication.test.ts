import { describe, it, expect } from "vitest";
import { MockCommunicationProvider } from "../../src/lib/communication/twilio";

describe("Communication Provider Abstraction", () => {
    it("Validates Mock Provider accurately tracks dummy outputs", async () => {
        const provider = new MockCommunicationProvider();
        const result = await provider.sendSms("+123", "sender", "Hello", "org-id");

        expect(result.success).toBe(true);
        expect(result.externalId).toContain("mock_");
    });
});
