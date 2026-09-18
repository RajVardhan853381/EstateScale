import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { Organization, User } from "@prisma/client";
import { listContacts } from "@/lib/services/contacts";

// Intercepting NextAuth module which triggers the next/server issue inside Node environment
vi.mock("next-auth", () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })
}));
import * as authorization from "@/lib/auth/authorization";

describe("Contacts Service", () => {
    let org: Organization;
    let user: User;

    beforeAll(async () => {
        // Clear DB
        await prisma.organization.deleteMany();
        await prisma.user.deleteMany();
        await prisma.contact.deleteMany();

        user = await prisma.user.create({ data: { email: "contact-test@test.com", name: "Contact Test User" } });

        org = await prisma.organization.create({
            data: {
                name: "Contact Test Org", slug: "contact-test-org",
                memberships: { create: { userId: user.id, role: "OWNER" } }
            }
        });

        vi.spyOn(authorization, 'requireOrganizationMember').mockResolvedValue({
            user: user as NonNullable<Awaited<ReturnType<typeof authorization.getCurrentUser>>>,
            organization: org,
            membership: { id: "mock-mem", userId: user.id, organizationId: org.id, role: "OWNER", createdAt: new Date(), updatedAt: new Date() }
        });
    });

    afterAll(async () => {
        vi.restoreAllMocks();
        await prisma.contact.deleteMany();
        await prisma.organization.deleteMany();
        await prisma.user.deleteMany();
    });

    describe("listContacts", () => {
        it("should return empty list when no contacts exist", async () => {
            const result = await listContacts(org.slug, { page: 1, limit: 10 });
            expect(result.contacts).toHaveLength(0);
            expect(result.pagination.total).toBe(0);
        });
    });
});
