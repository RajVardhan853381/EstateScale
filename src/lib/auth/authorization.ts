import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { OrganizationMembership } from '@prisma/client';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user;
});

export async function requireAuthenticatedUser(callbackUrl?: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login');
  }
  return user;
}

export const getCurrentOrganization = cache(async (slug: string) => {
  const org = await prisma.organization.findUnique({
    where: { slug },
  });
  return org;
});

export const requireOrganizationMember = cache(async (slug: string) => {
  const user = await requireAuthenticatedUser();

  // Optimized single-roundtrip query joining organization and membership
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId: user.id!,
      organization: { slug },
    },
    include: { organization: true },
  });

  if (!membership || !membership.organization) {
    const org = await getCurrentOrganization(slug);
    if (!org) {
      throw new Error('Organization not found');
    }
    throw new Error('Forbidden: Not a member of this organization');
  }

  const { organization, ...membershipData } = membership;
  return { user, organization, membership: membershipData as OrganizationMembership };
});

export async function requireRole(slug: string, allowedRoles: string[]) {
  const { user, organization, membership } = await requireOrganizationMember(slug);

  if (!allowedRoles.includes(membership.role)) {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return { user, organization, membership };
}

export async function assertTenantOwnership(
  organizationId: string,
  resourceOrganizationId: string
) {
  if (organizationId !== resourceOrganizationId) {
    throw new Error('Forbidden: Tenant isolation violation');
  }
}
