import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { getLead } from '../../src/lib/services/leads';
import { getContact } from '../../src/lib/services/contacts';
import { Organization, Lead, Contact } from '@prisma/client';

// Mock authorization
vi.mock('../../src/lib/auth/authorization', () => ({
  requireOrganizationMember: vi.fn().mockImplementation(async (slug: string) => {
    const org = await prisma.organization.findUnique({ where: { slug } });
    if (!org) throw new Error('NOT_FOUND');
    return {
      organization: org,
      user: { id: 'test-user-id' },
      membership: { id: 'test-membership-id', role: 'ADMIN' },
    };
  }),
}));

describe('Tenant Isolation - CRM', () => {
  let orgA: Organization;
  let orgB: Organization;
  let leadA: Lead;
  let leadB: Lead;
  let contactA: Contact;
  let contactB: Contact;

  beforeAll(async () => {
    // Clear DB
    await prisma.organization.deleteMany();

    orgA = await prisma.organization.create({
      data: { name: 'Org A', slug: 'org-a' },
    });
    orgB = await prisma.organization.create({
      data: { name: 'Org B', slug: 'org-b' },
    });

    contactA = await prisma.contact.create({
      data: { organizationId: orgA.id, email: 'a@example.com' },
    });
    contactB = await prisma.contact.create({
      data: { organizationId: orgB.id, email: 'b@example.com' },
    });

    leadA = await prisma.lead.create({
      data: { organizationId: orgA.id, contactId: contactA.id },
    });
    leadB = await prisma.lead.create({
      data: { organizationId: orgB.id, contactId: contactB.id },
    });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany();
  });

  it('User in Org A can read Lead A', async () => {
    const lead = await getLead('org-a', leadA.id);
    expect(lead.id).toBe(leadA.id);
  });

  it('User in Org A CANNOT read Lead B (from Org B)', async () => {
    await expect(getLead('org-a', leadB.id)).rejects.toThrow('NOT_FOUND');
  });

  it('User in Org A can read Contact A', async () => {
    const contact = await getContact('org-a', contactA.id);
    expect(contact.id).toBe(contactA.id);
  });

  it('User in Org A CANNOT read Contact B (from Org B)', async () => {
    await expect(getContact('org-a', contactB.id)).rejects.toThrow('NOT_FOUND');
  });
});
