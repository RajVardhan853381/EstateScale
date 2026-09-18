import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTag } from "../../../src/lib/services/tags";
import { prisma } from "../../../src/lib/prisma";
import * as authorization from "../../../src/lib/auth/authorization";
import { Tag } from "@prisma/client";

// Mock dependencies
vi.mock("../../../src/lib/prisma", () => ({
  prisma: {
    tag: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("../../../src/lib/auth/authorization", () => ({
  requireOrganizationMember: vi.fn(),
}));

describe("tags service", () => {
  describe("createTag", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should successfully create a tag when data is valid and user is authorized", async () => {
      // Setup mocks
      const mockOrg = { id: "org-123", slug: "test-org" };
      vi.mocked(authorization.requireOrganizationMember).mockResolvedValue({
        organization: mockOrg,
        membership: { id: "membership-123" } as unknown,
        user: { id: "user-123" } as unknown,
      } as Awaited<ReturnType<typeof authorization.requireOrganizationMember>>);

      const mockCreatedTag = { id: "tag-123", name: "urgent-buyer", organizationId: mockOrg.id, createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(prisma.tag.upsert).mockResolvedValue(mockCreatedTag as Tag);

      // Execute
      const result = await createTag("test-org", { name: "urgent-buyer" });

      // Assertions
      expect(authorization.requireOrganizationMember).toHaveBeenCalledWith("test-org");
      expect(prisma.tag.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_name: {
            organizationId: "org-123",
            name: "urgent-buyer",
          },
        },
        update: {},
        create: {
          organizationId: "org-123",
          name: "urgent-buyer",
        },
      });
      expect(result).toEqual(mockCreatedTag);
    });

    it("should throw an error when validation fails", async () => {
      // Setup mocks
      const mockOrg = { id: "org-123", slug: "test-org" };
      vi.mocked(authorization.requireOrganizationMember).mockResolvedValue({
        organization: mockOrg,
        membership: { id: "membership-123" } as unknown,
        user: { id: "user-123" } as unknown,
      } as Awaited<ReturnType<typeof authorization.requireOrganizationMember>>);

      // Execute & Assert
      // tagSchema requires 'name'
      await expect(createTag("test-org", {})).rejects.toThrow();

      // Also invalid name format (spaces are rejected by tagSchema)
      await expect(createTag("test-org", { name: "invalid tag" })).rejects.toThrow();

      // Prisma upsert should not be called if validation fails
      expect(prisma.tag.upsert).not.toHaveBeenCalled();
    });

    it("should propagate errors from requireOrganizationMember", async () => {
      // Setup mocks
      vi.mocked(authorization.requireOrganizationMember).mockRejectedValue(new Error("Unauthorized"));

      // Execute & Assert
      await expect(createTag("test-org", { name: "valid-tag" })).rejects.toThrow("Unauthorized");
      expect(prisma.tag.upsert).not.toHaveBeenCalled();
    });
  });
});
