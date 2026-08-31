import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/api/auth/signin");
  }
  return user;
}

export async function getCurrentOrganization(slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
  });
  return org;
}

export async function requireOrganizationMember(slug: string) {
  const user = await requireAuthenticatedUser();
  const organization = await getCurrentOrganization(slug);

  if (!organization) {
    throw new Error("Organization not found");
  }

  const membership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id!,
        organizationId: organization.id,
      },
    },
  });

  if (!membership) {
    throw new Error("Forbidden: Not a member of this organization");
  }

  return { user, organization, membership };
}

export async function requireRole(slug: string, allowedRoles: string[]) {
  const { user, organization, membership } = await requireOrganizationMember(slug);

  if (!allowedRoles.includes(membership.role)) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  return { user, organization, membership };
}

export async function assertTenantOwnership(organizationId: string, resourceOrganizationId: string) {
  if (organizationId !== resourceOrganizationId) {
    throw new Error("Forbidden: Tenant isolation violation");
  }
}
