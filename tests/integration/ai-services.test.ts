import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { Organization, User } from "@prisma/client";
import { analyzeLead } from "@/lib/services/ai";
import { MockAIProvider } from "@/lib/ai/provider";
// Intercepting NextAuth module which triggers the next/server issue inside Node environment
vi.mock("next-auth", () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })
}));
import * as authorization from "@/lib/auth/authorization";

const validMockOutput = {
    extraction: {
        intent: "BUY",
        budget: 650000,
        location: "Dallas",
        propertyType: "Single Family",
        timeline: "ASAP"
    },
    qualification: {
        qualificationStatus: "HOT",
        qualificationReason: "High budget, immediate timeline",
        missingInformation: [],
        confidence: 95
    },
    score: {
        score: 90,
        scoreReasoning: "Strong buy intent",
        signals: ["ASAP timeline", "Good budget"]
    },
    response: {
        suggestedResponse: "Hello! I saw you are looking for a Single Family home in Dallas."
    }
};

describe("AI Core Service Integrations", () => {
    let orgA: Organization;
    let orgB: Organization;
    let userA: User;
    let leadA: { id: string; organizationId: string; };
    let leadB: { id: string; organizationId: string; };

    beforeAll(async () => {
        await prisma.organization.deleteMany();
        await prisma.user.deleteMany();

        userA = await prisma.user.create({ data: { email: "ai-tester@test.com", name: "AI User" } });

        orgA = await prisma.organization.create({
            data: {
                name: "Org A AI", slug: "org-a-ai",
                memberships: { create: { userId: userA.id, role: "OWNER" } }
            }
        });

        orgB = await prisma.organization.create({
            data: {
                name: "Org B AI", slug: "org-b-ai"
            }
        });

        const contactA = await prisma.contact.create({
            data: { organizationId: orgA.id, email: "lead-a@ai.com" }
        });

        leadA = await prisma.lead.create({
            data: { organizationId: orgA.id, contactId: contactA.id, budget: 100, notesText: "Buyer looking for homes in Dallas." }
        });

        leadB = await prisma.lead.create({
            data: { organizationId: orgB.id, budget: 100, notesText: "Just testing." }
        });
    });

    afterAll(async () => {
        await prisma.organization.deleteMany();
        await prisma.user.deleteMany();
    });

    it("Successfully analyzes a lead and mutates databases appropriately", async () => {
        const membership = await prisma.organizationMembership.findFirst({ where: { userId: userA.id } });

        vi.spyOn(authorization, 'requireOrganizationMember').mockResolvedValue({
            user: userA as NonNullable<Awaited<ReturnType<typeof authorization.getCurrentUser>>>,
            organization: orgA,
            membership: membership!
        });

        const mockProvider = new MockAIProvider(validMockOutput);

        const assessment = await analyzeLead(orgA.slug, leadA.id, mockProvider);

        expect(assessment.score).toBe(90);
        expect(assessment.qualificationStatus).toBe("HOT");
        expect(assessment.intent).toBe("BUY");

        // Verify the lead itself mutated safely
        const updatedLead = await prisma.lead.findUnique({ where: { id: leadA.id } });
        expect(updatedLead?.intent).toBe("BUY");
        // The original budget was 100, AI extracted 650000. Wait, in AI logic: `budget: lead.budget || aiResult.extraction.budget`.
        // Lead already had budget 100, so it should NOT be overwritten!
        expect(updatedLead?.budget).toBe(100);
        expect(updatedLead?.location).toBe("Dallas"); // Original was null, so it gets overwritten

        // Verify usages logged
        const usages = await prisma.aiUsage.findMany({ where: { organizationId: orgA.id } });
        expect(usages.length).toBe(1);

        vi.restoreAllMocks();
    });

    it("Blocks AI Analysis cross-tenant", async () => {
        const membership = await prisma.organizationMembership.findFirst({ where: { userId: userA.id } });

        vi.spyOn(authorization, 'requireOrganizationMember').mockResolvedValue({
            user: userA as NonNullable<Awaited<ReturnType<typeof authorization.getCurrentUser>>>,
            organization: orgA,
            membership: membership!
        });

        const mockProvider = new MockAIProvider(validMockOutput);

        // orgA requesting to analyze leadB (belongs to orgB)
        await expect(analyzeLead(orgA.slug, leadB.id, mockProvider)).rejects.toThrow("NOT_FOUND");

        vi.restoreAllMocks();
    });
});
