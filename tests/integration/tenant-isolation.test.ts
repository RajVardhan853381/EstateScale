import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { Organization, User } from "@prisma/client";
import { getLead } from "@/lib/services/leads";
// Intercepting NextAuth module which triggers the next/server issue inside Node environment
vi.mock("next-auth", () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })
}));
import * as authorization from "@/lib/auth/authorization";

describe("Tenant Isolation - CRM", () => {
    let orgA: Organization;
    let orgB: Organization;
    let userA: User;
    let userB: User;

    beforeAll(async () => {
        // Clear DB
        await prisma.organization.deleteMany();
        await prisma.user.deleteMany();

        userA = await prisma.user.create({ data: { email: "a@test.com", name: "User A" } });
        userB = await prisma.user.create({ data: { email: "b@test.com", name: "User B" } });

        orgA = await prisma.organization.create({
            data: {
                name: "Org A", slug: "org-a",
                memberships: { create: { userId: userA.id, role: "OWNER" } }
            }
        });

        orgB = await prisma.organization.create({
            data: {
                name: "Org B", slug: "org-b",
                memberships: { create: { userId: userB.id, role: "OWNER" } }
            }
        });
    });

    afterAll(async () => {
        await prisma.organization.deleteMany();
        await prisma.user.deleteMany();
    });

    it("User A CANNOT read a lead in Org B", async () => {
        const leadB = await prisma.lead.create({
            data: { organizationId: orgB.id, budget: 1000 }
        });

        // Mock requireOrganizationMember to simulate User A trying to access Org A context
        // But the lead belongs to Org B.
        vi.spyOn(authorization, 'requireOrganizationMember').mockResolvedValue({
            user: userA as NonNullable<Awaited<ReturnType<typeof authorization.getCurrentUser>>>,
            organization: orgA,
            membership: { id: "mock-mem-a", userId: userA.id, organizationId: orgA.id, role: "OWNER", createdAt: new Date(), updatedAt: new Date() }
        });

        // Attempt to fetch Lead B using Org A's slug
        // The service internally fetches using `organizationId: orgA.id`, so it should return NOT_FOUND
        await expect(getLead(orgA.slug, leadB.id)).rejects.toThrow("NOT_FOUND");

        vi.restoreAllMocks();
    });
});
