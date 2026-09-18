import { describe, it, expect, vi, beforeEach } from "vitest";
import { TemplateService } from "../../src/lib/services/templates";
import { prisma } from "../../src/lib/prisma";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    template: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    }
  }
}));

type MockPrisma = {
    template: {
        findMany: (args: unknown) => void;
        findUnique: (args: unknown) => void;
        create: (args: unknown) => void;
        update: (args: unknown) => void;
    }
}

describe("Template Service Isolations", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fetch global and tenant templates securely", async () => {
        const mockPrisma = prisma as unknown as MockPrisma;
        mockPrisma.template.findMany = vi.fn().mockResolvedValue([{ id: "t1" }]);

        await TemplateService.getAvailableTemplates("org-1");

        expect(mockPrisma.template.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                OR: [
                    { organizationId: null },
                    { organizationId: "org-1" }
                ]
            }
        }));
    });

    it("should prevent cross-tenant duplication", async () => {
        const mockPrisma = prisma as unknown as MockPrisma;
        // Mock a template owned by org-2
        mockPrisma.template.findUnique = vi.fn().mockResolvedValue({
             id: "t1",
             organizationId: "org-2",
             type: "JOURNEY",
             config: {}
        });

        await expect(TemplateService.duplicateTemplate("org-1", "t1", "New")).rejects.toThrow("Tenant isolation violation");
    });

    it("should prevent updating Global System templates", async () => {
        const mockPrisma = prisma as unknown as MockPrisma;
        // Mock a Global template
        mockPrisma.template.findUnique = vi.fn().mockResolvedValue({
             id: "t1",
             organizationId: null, // Global
             type: "JOURNEY",
             config: {}
        });

        await expect(TemplateService.updateTemplate("org-1", "t1", { name: "Hack" })).rejects.toThrow("Forbidden: Cannot modify Global System templates");
    });
});
