import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export class OnboardingService {
  static async activateOrganization(slug: string) {
    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({
        where: { slug },
        include: { setupState: true }
      });

      if (!org || !org.setupState) {
        throw new Error("Organization or setup state not found");
      }

      // Check mandatory requirements
      const adminCount = await tx.organizationMembership.count({
        where: {
          organizationId: org.id,
          role: { in: ["OWNER", "ADMIN"] }
        }
      });

      if (adminCount === 0) {
        throw new Error("Cannot activate: No active administrators found");
      }

      // Mark as activated
      await tx.organizationSetupState.update({
        where: { organizationId: org.id },
        data: {
          isConfiguring: false,
          isReadyForActive: true,
          currentStep: "COMPLETE"
        }
      });

      return tx.organization.update({
        where: { id: org.id },
        data: { status: "ACTIVE" }
      });
    });
  }

  static async createOrganization(data: { name: string; slug: string; adminEmail?: string }) {
    return prisma.$transaction(async (tx) => {
      // Create Organization
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug: data.slug,
          status: "ACTIVE", // Or INITIALIZING based on requirements
          setupState: {
            create: {
              currentStep: "COMPANY",
              completedSteps: [],
              isConfiguring: true,
              isReadyForTest: false,
              isReadyForActive: false
            }
          }
        },
        include: {
          setupState: true
        }
      });

      // Initialize default CRM Pipeline
      const pipeline = await tx.pipeline.create({
        data: {
          organizationId: org.id,
          name: "Default Sales Pipeline",
          description: "Standard sales process",
        }
      });

      // Initialize Pipeline Stages
      await tx.pipelineStage.createMany({
        data: [
          { organizationId: org.id, pipelineId: pipeline.id, name: "NEW", order: 1 },
          { organizationId: org.id, pipelineId: pipeline.id, name: "CONTACTED", order: 2 },
          { organizationId: org.id, pipelineId: pipeline.id, name: "QUALIFIED", order: 3 },
          { organizationId: org.id, pipelineId: pipeline.id, name: "APPOINTMENT", order: 4 },
          { organizationId: org.id, pipelineId: pipeline.id, name: "NEGOTIATION", order: 5 },
          { organizationId: org.id, pipelineId: pipeline.id, name: "WON", order: 6 },
          { organizationId: org.id, pipelineId: pipeline.id, name: "LOST", order: 7 },
        ]
      });

      let invitation = null;
      if (data.adminEmail) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        invitation = await tx.organizationInvitation.create({
          data: {
            organizationId: org.id,
            email: data.adminEmail,
            role: "OWNER",
            token,
            expiresAt
          }
        });
      }

      return { org, invitation };
    });
  }
}
