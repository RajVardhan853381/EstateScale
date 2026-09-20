/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listLeadActivities } from "../../src/lib/services/activities";
import { prisma } from "../../src/lib/prisma";
import * as authorization from "../../src/lib/auth/authorization";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    lead: {
      findFirst: vi.fn()
    },
    leadActivity: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("../../src/lib/auth/authorization", () => ({
  requireOrganizationMember: vi.fn()
}));

type MockPrisma = {
    lead: { findFirst: any };
    leadActivity: { findMany: any };
};

describe("Activities Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return empty array when there are no activities for a lead", async () => {
        const mockPrisma = prisma as any as MockPrisma;

        // Mock authorization
        vi.spyOn(authorization, 'requireOrganizationMember').mockResolvedValue({
            organization: { id: "org-1" },
        } as any);

        // Mock existing lead
        mockPrisma.lead.findFirst.mockResolvedValue({
            id: "lead-1",
            organizationId: "org-1"
        });

        // Mock empty activities
        mockPrisma.leadActivity.findMany.mockResolvedValue([]);

        const result = await listLeadActivities("org-slug", "lead-1");

        expect(mockPrisma.lead.findFirst).toHaveBeenCalledWith({
            where: { id: "lead-1", organizationId: "org-1" }
        });

        expect(mockPrisma.leadActivity.findMany).toHaveBeenCalledWith({
            where: {
                organizationId: "org-1",
                leadId: "lead-1"
            },
            orderBy: { createdAt: "desc" },
            include: {
                user: { include: { user: true } }
            },
            take: 100
        });

        expect(result).toEqual([]);
    });

    it("should throw NOT_FOUND if lead does not exist", async () => {
        const mockPrisma = prisma as any as MockPrisma;

        // Mock authorization
        vi.spyOn(authorization, 'requireOrganizationMember').mockResolvedValue({
            organization: { id: "org-1" },
        } as any);

        // Mock missing lead
        mockPrisma.lead.findFirst.mockResolvedValue(null);

        await expect(listLeadActivities("org-slug", "lead-1")).rejects.toThrow("NOT_FOUND");
    });
});
