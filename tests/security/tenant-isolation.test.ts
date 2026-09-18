import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertTenantOwnership, requireRole } from "../../src/lib/auth/authorization";

vi.mock("../../src/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1", email: "test@example.com" } })
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn().mockResolvedValue({ id: "org-1", slug: "org-1" })
    },
    organizationMembership: {
      findUnique: vi.fn()
    }
  }
}));

import { prisma } from "../../src/lib/prisma";

type MockPrisma = {
    organization: { findUnique: (args: unknown) => void };
    organizationMembership: { findUnique: (args: unknown) => void };
}

describe("Tenant Isolation & RBAC", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should assert tenant ownership perfectly matching", async () => {
        await expect(assertTenantOwnership("org-1", "org-1")).resolves.toBeUndefined();
    });

    it("should throw error when tenant ownership fails", async () => {
        await expect(assertTenantOwnership("org-1", "org-2")).rejects.toThrow("Forbidden: Tenant isolation violation");
    });

    it("requireRole should throw if user lacks permissions", async () => {
        const mockPrisma = prisma as unknown as MockPrisma;
        mockPrisma.organization.findUnique = vi.fn().mockResolvedValue({ id: "org-1", slug: "org-1" });
        mockPrisma.organizationMembership.findUnique = vi.fn().mockResolvedValue({ role: "MEMBER" });

        await expect(requireRole("org-1", ["ADMIN", "OWNER"])).rejects.toThrow("Forbidden: Insufficient permissions");
    });

    it("requireRole should pass if user has correct permissions", async () => {
        const mockPrisma = prisma as unknown as MockPrisma;
        mockPrisma.organization.findUnique = vi.fn().mockResolvedValue({ id: "org-1", slug: "org-1" });
        mockPrisma.organizationMembership.findUnique = vi.fn().mockResolvedValue({ role: "OWNER" });

        const result = await requireRole("org-1", ["ADMIN", "OWNER"]);
        expect(result.membership.role).toBe("OWNER");
    });
});
