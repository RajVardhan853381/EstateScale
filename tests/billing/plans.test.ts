import { describe, it, expect } from "vitest";
import { getPlanByStripePriceId, getPlanLimits } from "../../src/lib/billing/plans";

describe("Billing Plans & Entitlements", () => {
    it("should resolve correct plan by price ID", () => {
        const mockGrowthId = process.env.STRIPE_PRICE_ID_GROWTH || "price_growth_mock";
        const plan = getPlanByStripePriceId(mockGrowthId);
        expect(plan.id).toBe("GROWTH");
        expect(plan.price).toBe(29900);
    });

    it("should default to FREE for unknown price ID", () => {
        const plan = getPlanByStripePriceId("invalid_price_id_123");
        expect(plan.id).toBe("FREE");
    });

    it("should resolve correct limits for plan ID", () => {
        const limits = getPlanLimits("AI_PRO");
        expect(limits.leads).toBe(10000);
        expect(limits.sms).toBe(5000);
    });
});
