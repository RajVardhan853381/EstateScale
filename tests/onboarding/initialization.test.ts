import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { OnboardingService } from "../../src/lib/services/onboarding";

describe("Onboarding Initialization", () => {
  beforeEach(async () => {
    await prisma.organization.deleteMany();
  });

  afterAll(async () => {
    await prisma.organization.deleteMany();
  });

  it("should create organization with defaults", async () => {
    const { org, invitation } = await OnboardingService.createOrganization({
      name: "Test Org",
      slug: "test-org",
      adminEmail: "admin@test.com"
    });

    expect(org.slug).toBe("test-org");
    expect(org.setupState).toBeDefined();
    expect(org.setupState?.currentStep).toBe("COMPANY");

    expect(invitation).toBeDefined();
    expect(invitation?.email).toBe("admin@test.com");

    const pipeline = await prisma.pipeline.findFirst({
        where: { organizationId: org.id }
    });

    expect(pipeline).toBeDefined();

    const stages = await prisma.pipelineStage.findMany({
        where: { pipelineId: pipeline?.id }
    });

    expect(stages.length).toBe(7);
  });
});
