import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addTagToLead, removeTagFromLead, createTag, listTags } from '../../../src/lib/services/tags';
import { prisma } from '../../../src/lib/prisma';
import { requireOrganizationMember } from '../../../src/lib/auth/authorization';
import { LeadActivityType } from '@prisma/client';

vi.mock('../../../src/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    tag: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../../src/lib/auth/authorization', () => ({
  requireOrganizationMember: vi.fn(),
}));

describe('tags service', () => {
  const mockOrg = { id: 'org-1' };
  const mockMembership = { id: 'user-1' };
  const mockLead = { id: 'lead-1', organizationId: 'org-1' };
  const mockTag = { id: 'tag-1', organizationId: 'org-1', name: 'Test_Tag' };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createTag', () => {
    it('should upsert a new tag', async () => {
      vi.mocked(requireOrganizationMember).mockResolvedValue({
        organization: mockOrg,
        membership: mockMembership,
      } as any);

      vi.mocked(prisma.tag.upsert).mockResolvedValue(mockTag as any);

      const result = await createTag('test-slug', { name: 'Test_Tag' });

      expect(requireOrganizationMember).toHaveBeenCalledWith('test-slug');
      expect(prisma.tag.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_name: {
            organizationId: 'org-1',
            name: 'Test_Tag',
          },
        },
        update: {},
        create: {
          organizationId: 'org-1',
          name: 'Test_Tag',
        },
      });
      expect(result).toEqual(mockTag);
    });
  });

  describe('listTags', () => {
    it('should find many tags', async () => {
      vi.mocked(requireOrganizationMember).mockResolvedValue({
        organization: mockOrg,
        membership: mockMembership,
      } as any);

      vi.mocked(prisma.tag.findMany).mockResolvedValue([mockTag] as any);

      const result = await listTags('test-slug');

      expect(requireOrganizationMember).toHaveBeenCalledWith('test-slug');
      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([mockTag]);
    });
  });

  describe('addTagToLead', () => {
    it('should throw NOT_FOUND if lead does not exist', async () => {
      vi.mocked(requireOrganizationMember).mockResolvedValue({
        organization: mockOrg,
        membership: mockMembership,
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          lead: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        });
      });

      await expect(addTagToLead('test-slug', 'invalid-lead', 'tag-1')).rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND if tag does not exist', async () => {
      vi.mocked(requireOrganizationMember).mockResolvedValue({
        organization: mockOrg,
        membership: mockMembership,
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          lead: {
            findFirst: vi.fn().mockResolvedValue(mockLead),
          },
          tag: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        });
      });

      await expect(addTagToLead('test-slug', 'lead-1', 'invalid-tag')).rejects.toThrow('NOT_FOUND');
    });

    it('should return existing link if already tagged', async () => {
      vi.mocked(requireOrganizationMember).mockResolvedValue({
        organization: mockOrg,
        membership: mockMembership,
      } as any);

      const mockLeadTag = { leadId: 'lead-1', tagId: 'tag-1' };

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          lead: {
            findFirst: vi.fn().mockResolvedValue(mockLead),
          },
          tag: {
            findFirst: vi.fn().mockResolvedValue(mockTag),
          },
          leadTag: {
            findUnique: vi.fn().mockResolvedValue(mockLeadTag),
          },
        });
      });

      const result = await addTagToLead('test-slug', 'lead-1', 'tag-1');
      expect(result).toEqual(mockLeadTag);
    });

    it('should create new link and activity if not already tagged', async () => {
      vi.mocked(requireOrganizationMember).mockResolvedValue({
        organization: mockOrg,
        membership: mockMembership,
      } as any);

      const mockLeadTag = { leadId: 'lead-1', tagId: 'tag-1' };
      const createLeadTagMock = vi.fn().mockResolvedValue(mockLeadTag);
      const createActivityMock = vi.fn().mockResolvedValue({});

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          lead: {
            findFirst: vi.fn().mockResolvedValue(mockLead),
          },
          tag: {
            findFirst: vi.fn().mockResolvedValue(mockTag),
          },
          leadTag: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: createLeadTagMock,
          },
          leadActivity: {
            create: createActivityMock,
          },
        });
      });

      const result = await addTagToLead('test-slug', 'lead-1', 'tag-1');

      expect(createLeadTagMock).toHaveBeenCalledWith({
        data: { leadId: 'lead-1', tagId: 'tag-1' },
      });
      expect(createActivityMock).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          leadId: 'lead-1',
          userId: 'user-1',
          type: LeadActivityType.TAG_ADDED,
          description: `Added tag: Test_Tag`,
        },
      });
      expect(result).toEqual(mockLeadTag);
    });
  });

  describe('removeTagFromLead', () => {
    it('should throw NOT_FOUND if lead does not exist', async () => {
      vi.mocked(requireOrganizationMember).mockResolvedValue({
        organization: mockOrg,
        membership: mockMembership,
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          lead: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        });
      });

      await expect(removeTagFromLead('test-slug', 'invalid-lead', 'tag-1')).rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND if tag does not exist', async () => {
      vi.mocked(requireOrganizationMember).mockResolvedValue({
        organization: mockOrg,
        membership: mockMembership,
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          lead: {
            findFirst: vi.fn().mockResolvedValue(mockLead),
          },
          tag: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        });
      });

      await expect(removeTagFromLead('test-slug', 'lead-1', 'invalid-tag')).rejects.toThrow('NOT_FOUND');
    });

    it('should remove tag and log activity', async () => {
      vi.mocked(requireOrganizationMember).mockResolvedValue({
        organization: mockOrg,
        membership: mockMembership,
      } as any);

      const deleteLeadTagMock = vi.fn().mockResolvedValue({});
      const createActivityMock = vi.fn().mockResolvedValue({});

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          lead: {
            findFirst: vi.fn().mockResolvedValue(mockLead),
          },
          tag: {
            findFirst: vi.fn().mockResolvedValue(mockTag),
          },
          leadTag: {
            delete: deleteLeadTagMock,
          },
          leadActivity: {
            create: createActivityMock,
          },
        });
      });

      await removeTagFromLead('test-slug', 'lead-1', 'tag-1');

      expect(deleteLeadTagMock).toHaveBeenCalledWith({
        where: {
          leadId_tagId: { leadId: 'lead-1', tagId: 'tag-1' }
        },
      });
      expect(createActivityMock).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          leadId: 'lead-1',
          userId: 'user-1',
          type: LeadActivityType.TAG_REMOVED,
          description: `Removed tag: Test_Tag`,
        },
      });
    });
  });
});
