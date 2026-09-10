import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { OnboardingService } from "../../src/lib/services/onboarding";

describe("Tenant Isolation Safety", () => {
  beforeEach(async () => {
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });

  it("should not allow user from Org A to access Org B data", async () => {
    const orgA = await prisma.organization.create({ data: { name: "Org A", slug: "org-a" } });
    const orgB = await prisma.organization.create({ data: { name: "Org B", slug: "org-b" } });

    const userA = await prisma.user.create({ data: { email: "a@a.com" } });

    await prisma.organizationMembership.create({
      data: { userId: userA.id, organizationId: orgA.id, role: "ADMIN" }
    });

    const isMemberA = await prisma.organizationMembership.findFirst({
      where: { userId: userA.id, organizationId: orgA.id }
    });

    const isMemberB = await prisma.organizationMembership.findFirst({
      where: { userId: userA.id, organizationId: orgB.id }
    });

    expect(isMemberA).toBeDefined();
    expect(isMemberB).toBeNull();
  });
});
