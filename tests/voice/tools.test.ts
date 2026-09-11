import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { authorizeTools, voiceTools } from "../../src/lib/voice/ai/tools";

describe("Voice AI Tools Authorization", () => {
    beforeEach(async () => {
        await prisma.organization.deleteMany();
    });

    afterAll(async () => {
        await prisma.organization.deleteMany();
    });

    it("should authorize only configured tools for the voice agent", async () => {
        const org = await prisma.organization.create({
            data: { name: "Tools Org", slug: "tools-org" }
        });

        const agent = await prisma.voiceAgent.create({
            data: {
                organizationId: org.id,
                name: "Test Agent",
                enabled: true,
                systemPrompt: "Test",
                allowedTools: ["qualifyLead", "addLeadNote"]
            }
        });

        const allowed = await authorizeTools(agent.id, org.id);

        expect(allowed).toContain("addLeadNote");
        expect(allowed).not.toContain("deleteLead");
    });

    it("should block tools cross-tenant", async () => {
        const org1 = await prisma.organization.create({ data: { name: "Org 1", slug: "org-1" } });
        const org2 = await prisma.organization.create({ data: { name: "Org 2", slug: "org-2" } });

        const agent = await prisma.voiceAgent.create({
            data: {
                organizationId: org1.id,
                name: "Test Agent 1",
                enabled: true,
                systemPrompt: "Test",
                allowedTools: ["qualifyLead"]
            }
        });

        const allowed = await authorizeTools(agent.id, org2.id); // Try to auth org1's agent using org2 ID
        expect(allowed.length).toBe(0);
    });

    it("should safely update lead status when tool is executed", async () => {
        const org = await prisma.organization.create({ data: { name: "Exec Org", slug: "exec-org" } });
        const lead = await prisma.lead.create({ data: { organizationId: org.id, status: "NEW" } });

        const result = await voiceTools.updateLeadStatus.execute(
            { status: "CONTACTED" },
            { organizationId: org.id, leadId: lead.id }
        );

        expect(result).toContain("CONTACTED");

        const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
        expect(updated?.status).toBe("CONTACTED");
    });
});
