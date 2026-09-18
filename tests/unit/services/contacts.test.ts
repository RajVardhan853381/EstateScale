import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";

// Mock the dependencies
const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contact: {
      findMany: (...args: any[]) => mockFindMany(...args),
      count: (...args: any[]) => mockCount(...args),
    },
  },
}));

vi.mock("@/lib/auth/authorization", () => ({
  requireOrganizationMember: vi.fn().mockResolvedValue({
    organization: { id: "org-1", slug: "test-org" }
  })
}));

import { listContacts } from "@/lib/services/contacts";

describe("Contacts Service - listContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should paginate correctly with page 1 and limit 10", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const result = await listContacts("test-org", { page: 1, limit: 10 });

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      orderBy: { updatedAt: "desc" },
      skip: 0,
      take: 10,
      include: {
        _count: { select: { leads: true } },
        leads: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { updatedAt: true },
        },
      },
    });

    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    });
  });

  it("should calculate skip correctly for page 3", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(25);

    const result = await listContacts("test-org", { page: 3, limit: 10 });

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 20,
      take: 10,
    }));

    expect(result.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 25,
      totalPages: 3
    });
  });

  it("should use default pagination values when none provided", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const result = await listContacts("test-org", {});

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 20,
    }));

    expect(result.pagination.limit).toBe(20);
    expect(result.pagination.page).toBe(1);
  });

  it("should return contacts data from prisma", async () => {
    const mockContacts = [
      { id: "contact-1", firstName: "John", lastName: "Doe" },
      { id: "contact-2", firstName: "Jane", lastName: "Smith" }
    ];

    mockFindMany.mockResolvedValue(mockContacts);
    mockCount.mockResolvedValue(2);

    const result = await listContacts("test-org", { page: 1, limit: 10 });

    expect(result.contacts).toEqual(mockContacts);
    expect(result.pagination.total).toBe(2);
  });

  it("should throw a ZodError for invalid limits", async () => {
    await expect(listContacts("test-org", { page: 1, limit: 500 }))
      .rejects.toThrow(ZodError);
  });
});
