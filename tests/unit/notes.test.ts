import { describe, it, expect, vi } from "vitest";
import { updateNote } from "@/lib/services/notes";

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

import { prisma } from "@/lib/prisma";
import { requireOrganizationMember } from "@/lib/auth/authorization";

describe("Notes Service - updateNote", () => {
    it("throws NOT_FOUND if note belongs to another user", async () => {
        const mockOrg = { id: "org_1" };
        const mockMembership = { id: "user_b" };

        vi.mocked(requireOrganizationMember).mockResolvedValue({
            organization: mockOrg,
            membership: mockMembership,
        } as any);

        vi.mocked(prisma.note.findFirst).mockResolvedValue(null); // Simulate note not found for this user

        await expect(updateNote("org-slug", "note_id", { content: "updated" }))
            .rejects.toThrow("NOT_FOUND");

        expect(prisma.note.findFirst).toHaveBeenCalledWith({
            where: {
                id: "note_id",
                organizationId: "org_1",
                userId: "user_b"
            }
        });
    });

    it("updates note if it belongs to the user", async () => {
        const mockOrg = { id: "org_1" };
        const mockMembership = { id: "user_a" };

        vi.mocked(requireOrganizationMember).mockResolvedValue({
            organization: mockOrg,
            membership: mockMembership,
        } as any);

        const existingNote = { id: "note_id", content: "original", userId: "user_a" };
        vi.mocked(prisma.note.findFirst).mockResolvedValue(existingNote as any);

        const updatedNote = { id: "note_id", content: "updated", userId: "user_a" };
        vi.mocked(prisma.note.update).mockResolvedValue(updatedNote as any);

        const result = await updateNote("org-slug", "note_id", { content: "updated" });

        expect(result).toEqual(updatedNote);

        expect(prisma.note.update).toHaveBeenCalledWith({
            where: { id: "note_id" },
            data: { content: "updated" },
            include: { user: { include: { user: true } } }
        });
    });
});
