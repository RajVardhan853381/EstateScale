export const PLANS = {
    FREE: {
        id: "FREE",
        name: "Free",
        price: 0,
        stripePriceId: null,
        limits: { leads: 50, aiTokens: 0, sms: 0 }
    },
    STARTER: {
        id: "STARTER",
        name: "Starter",
        price: 19900, // $199.00
        stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || "price_starter_mock",
        limits: { leads: 1000, aiTokens: 50000, sms: 500 }
    },
    GROWTH: {
        id: "GROWTH",
        name: "Growth",
        price: 29900,
        stripePriceId: process.env.STRIPE_PRICE_ID_GROWTH || "price_growth_mock",
        limits: { leads: 5000, aiTokens: 200000, sms: 2000 }
    },
    AI_PRO: {
        id: "AI_PRO",
        name: "AI Pro",
        price: 59900,
        stripePriceId: process.env.STRIPE_PRICE_ID_AIPRO || "price_aipro_mock",
        limits: { leads: 10000, aiTokens: 1000000, sms: 5000 }
    },
    ENTERPRISE: {
        id: "ENTERPRISE",
        name: "Enterprise",
        price: 100000,
        stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || "price_enterprise_mock",
        limits: { leads: 999999, aiTokens: 9999999, sms: 50000 }
    }
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanLimits(planId: string) {
    const plan = PLANS[planId as PlanKey] || PLANS.FREE;
    return plan.limits;
}

export function getPlanByStripePriceId(priceId: string) {
    return Object.values(PLANS).find(p => p.stripePriceId === priceId) || PLANS.FREE;
}
