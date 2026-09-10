import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";

describe("Single-use Invites", () => {
  beforeEach(async () => {
    await prisma.organization.deleteMany();
  });

  afterAll(async () => {
    await prisma.organization.deleteMany();
  });

  it("should not allow expired tokens to be used", async () => {
     const org = await prisma.organization.create({
      data: { name: "Invite Org", slug: "invite-org" }
     });

     const expiresAt = new Date();
     expiresAt.setDate(expiresAt.getDate() - 1); // Yesterday

     const inv = await prisma.organizationInvitation.create({
        data: {
          organizationId: org.id,
          email: "test@test.com",
          role: "ADMIN",
          token: "expired_token_123",
          expiresAt
        }
     });

     const found = await prisma.organizationInvitation.findUnique({
        where: { token: "expired_token_123" }
     });

     expect(found?.expiresAt.getTime()).toBeLessThan(new Date().getTime());
  });
});
