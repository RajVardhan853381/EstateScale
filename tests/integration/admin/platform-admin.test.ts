import { describe, it, expect, vi, beforeEach } from "vitest";
import { requirePlatformAdmin } from "../../../src/lib/auth/platform-authorization";
import { prisma } from "../../../src/lib/prisma";

vi.mock("../../../src/lib/auth/authorization", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: "user-normal", email: "test@example.com" })
}));

vi.mock("../../../src/lib/prisma", () => ({
  prisma: {
    platformAdmin: {
      findUnique: vi.fn()
    }
  }
}));

type MockPrisma = {
    platformAdmin: { findUnique: (args: unknown) => void };
}

describe("Platform Admin Authorization Boundaries", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should throw Forbidden when normal user tries to access ops", async () => {
        const mockPrisma = prisma as unknown as MockPrisma;
        mockPrisma.platformAdmin.findUnique = vi.fn().mockResolvedValue(null);

        await expect(requirePlatformAdmin()).rejects.toThrow("Forbidden: Platform administrator access required");
    });

    it("should pass when valid platform admin tries to access ops", async () => {
        const mockPrisma = prisma as unknown as MockPrisma;
        mockPrisma.platformAdmin.findUnique = vi.fn().mockResolvedValue({ id: "pa-1", role: "SUPER_ADMIN" });

        const result = await requirePlatformAdmin();
        expect(result.platformAdmin.role).toBe("SUPER_ADMIN");
    });
});
