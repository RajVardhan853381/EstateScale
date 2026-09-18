import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateNote } from "@/lib/services/notes";
import { prisma } from "@/lib/prisma";
import * as authorization from "@/lib/auth/authorization";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
    prisma: {
        note: {
            findFirst: vi.fn(),
            update: vi.fn()
        }
    }
}));

vi.mock("@/lib/auth/authorization", () => ({
    requireOrganizationMember: vi.fn()
}));

vi.mock("next-auth", () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })
}));

describe("Notes Service - updateNote", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should throw NOT_FOUND if a user tries to update another user's note", async () => {
        // Arrange
        const orgSlug = "test-org";
        const noteId = "note-123";
        const userId = "user-123";
        const orgId = "org-123";

        // Mock authorization to return a specific user
        vi.mocked(authorization.requireOrganizationMember).mockResolvedValue({
            organization: { id: orgId, slug: orgSlug, name: "Test Org", createdAt: new Date(), updatedAt: new Date(), status: "ACTIVE", settings: {} },
            membership: { id: "mem-123", userId: userId, organizationId: orgId, role: "MEMBER", createdAt: new Date(), updatedAt: new Date() },
            user: { id: userId, email: "test@test.com", name: null, image: null }
        });

        // Mock Prisma to return null (note not found for this user/org combination)
        vi.mocked(prisma.note.findFirst).mockResolvedValue(null);

        // Act & Assert
        await expect(updateNote(orgSlug, noteId, { content: "Updated content" }))
            .rejects
            .toThrow("NOT_FOUND");

        // Verify Prisma was called with correct parameters emphasizing the creator check
        expect(prisma.note.findFirst).toHaveBeenCalledWith({
            where: {
                id: noteId,
                organizationId: orgId,
                userId: "mem-123" // The membership ID, as required by the code
            }
        });

        // Verify update was never called
        expect(prisma.note.update).not.toHaveBeenCalled();
    });

    it("should successfully update a note if the user is the creator", async () => {
        // Arrange
        const orgSlug = "test-org";
        const noteId = "note-123";
        const userId = "user-123";
        const orgId = "org-123";

        vi.mocked(authorization.requireOrganizationMember).mockResolvedValue({
            organization: { id: orgId, slug: orgSlug, name: "Test Org", createdAt: new Date(), updatedAt: new Date(), status: "ACTIVE", settings: {} },
            membership: { id: "mem-123", userId: userId, organizationId: orgId, role: "MEMBER", createdAt: new Date(), updatedAt: new Date() },
            user: { id: userId, email: "test@test.com", name: null, image: null }
        });

        const mockNote = {
            id: noteId,
            content: "Old content",
            organizationId: orgId,
            userId: "mem-123",
            leadId: "lead-123",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        vi.mocked(prisma.note.findFirst).mockResolvedValue(mockNote);
        vi.mocked(prisma.note.update).mockResolvedValue({
            ...mockNote,
            content: "Updated content"
        });

        // Act
        const result = await updateNote(orgSlug, noteId, { content: "Updated content" });

        // Assert
        expect(result.content).toBe("Updated content");
        expect(prisma.note.update).toHaveBeenCalledWith({
            where: { id: noteId },
            data: { content: "Updated content" },
            include: { user: { include: { user: true } } }
        });
    });
});
