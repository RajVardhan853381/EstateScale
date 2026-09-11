import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { getAuthorizedTools, studioTools } from "../../src/lib/ai/studio/tools";

describe("AI Studio Tools Authorization", () => {
    beforeEach(async () => {
        await prisma.organization.deleteMany();
    });

    afterAll(async () => {
        await prisma.organization.deleteMany();
    });

    it("should authorize only configured tools for the AI agent or copilot", async () => {
        const allowed = getAuthorizedTools(["searchLeads", "updateLeadStatus"]);

        expect(allowed).toHaveProperty("searchLeads");
        expect(allowed).toHaveProperty("updateLeadStatus");
        expect(allowed).not.toHaveProperty("getPipelineSummary");
    });

    it("should safely update lead status when tool is executed", async () => {
        const org = await prisma.organization.create({ data: { name: "Exec Org", slug: "exec-org" } });
        const lead = await prisma.lead.create({ data: { organizationId: org.id, status: "NEW" } });

        const result = await studioTools.updateLeadStatus.execute(
            { leadId: lead.id, status: "CONTACTED" },
            { organizationId: org.id }
        );

        expect((result as { success: boolean }).success).toBe(true);

        const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
        expect(updated?.status).toBe("CONTACTED");
    });

    it("should block tools from modifying cross-tenant records", async () => {
        const org1 = await prisma.organization.create({ data: { name: "Org 1", slug: "org-1" } });
        const org2 = await prisma.organization.create({ data: { name: "Org 2", slug: "org-2" } });

        const leadOrg1 = await prisma.lead.create({ data: { organizationId: org1.id, status: "NEW" } });

        try {
            await studioTools.updateLeadStatus.execute(
                { leadId: leadOrg1.id, status: "CONTACTED" },
                { organizationId: org2.id } // Executing with Org2 context on Org1 lead
            );
        } catch (error) {
            // Prisma will throw RecordNotFound which is safe
        }

        const verify = await prisma.lead.findUnique({ where: { id: leadOrg1.id } });
        expect(verify?.status).toBe("NEW"); // Should not have updated
    });
});
