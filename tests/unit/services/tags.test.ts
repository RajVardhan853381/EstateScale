import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTag } from '../../../src/lib/services/tags';
import { prisma } from '../../../src/lib/prisma';
import * as authorization from '../../../src/lib/auth/authorization';

// Mock dependencies
vi.mock('../../../src/lib/prisma', () => ({
  prisma: {
    tag: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../../src/lib/auth/authorization', () => ({
  requireOrganizationMember: vi.fn(),
}));

describe('Tags Service - createTag', () => {
  const mockOrg = { id: 'org_123', name: 'Test Org' };
  const mockSlug = 'test-org';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully create a tag when validation passes', async () => {
    // Arrange
    const mockData = { name: 'vip-customer' };
    const mockUpsertedTag = { id: 'tag_1', name: 'vip-customer', organizationId: mockOrg.id };

    vi.mocked(authorization.requireOrganizationMember).mockResolvedValue({
      organization: mockOrg as any,
      user: { id: 'user_1' } as any,
      membership: { role: 'MEMBER' } as any,
    });

    vi.mocked(prisma.tag.upsert).mockResolvedValue(mockUpsertedTag as any);

    // Act
    const result = await createTag(mockSlug, mockData);

    // Assert
    expect(authorization.requireOrganizationMember).toHaveBeenCalledWith(mockSlug);
    expect(prisma.tag.upsert).toHaveBeenCalledWith({
      where: {
        organizationId_name: {
          organizationId: mockOrg.id,
          name: 'vip-customer',
        },
      },
      update: {},
      create: {
        organizationId: mockOrg.id,
        name: 'vip-customer',
      },
    });
    expect(result).toEqual(mockUpsertedTag);
  });

  it('should throw an error if validation fails', async () => {
    // Arrange
    const mockData = { name: 'invalid tag name with spaces' };

    vi.mocked(authorization.requireOrganizationMember).mockResolvedValue({
      organization: mockOrg as any,
      user: { id: 'user_1' } as any,
      membership: { role: 'MEMBER' } as any,
    });

    // Act & Assert
    await expect(createTag(mockSlug, mockData)).rejects.toThrow();
    expect(prisma.tag.upsert).not.toHaveBeenCalled();
  });

  it('should throw an error if authorization fails', async () => {
    // Arrange
    const mockData = { name: 'vip-customer' };

    vi.mocked(authorization.requireOrganizationMember).mockRejectedValue(new Error('Forbidden'));

    // Act & Assert
    await expect(createTag(mockSlug, mockData)).rejects.toThrow('Forbidden');
    expect(prisma.tag.upsert).not.toHaveBeenCalled();
  });
});
