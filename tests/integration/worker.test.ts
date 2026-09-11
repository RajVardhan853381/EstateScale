import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { Organization } from "@prisma/client";
import { evaluateAutomationsForEvent } from "@/lib/automations/engine";
// Intercepting BullMQ so we don't accidentally fire Redis payloads during CI test pipelines
vi.mock("@/lib/queue/producer", () => ({
    enqueueAutomationJob: vi.fn().mockResolvedValue(true),
    AUTOMATION_QUEUE_NAME: "test-queue"
}));
import * as producer from "@/lib/queue/producer";

describe("Automation Engine Integration", () => {
    let org: Organization;
    let lead: { id: string };

    beforeAll(async () => {
        await prisma.organization.deleteMany();
        org = await prisma.organization.create({
            data: { name: "Auto Org", slug: "auto-org" }
        });

        const contact = await prisma.contact.create({
            data: { organizationId: org.id, email: "auto@lead.com" }
        });

        lead = await prisma.lead.create({
            data: { organizationId: org.id, contactId: contact.id }
        });

        await prisma.automation.create({
            data: {
                organizationId: org.id,
                name: "Auto AI Analysis",
                triggerType: "LEAD_CREATED",
                actionType: "AI_LEAD_ANALYSIS",
                enabled: true
            }
        });
    });

    afterAll(async () => {
        await prisma.organization.deleteMany();
    });

    it("Dispatches a background job when a matching event is published", async () => {
        await evaluateAutomationsForEvent({
            eventId: "test-event-uuid-1",
            type: "LEAD_CREATED",
            organizationId: org.id,
            leadId: lead.id
        });

        const execution = await prisma.automationExecution.findFirst({
            where: { leadId: lead.id, status: "PENDING" }
        });

        expect(execution).toBeDefined();
        expect(producer.enqueueAutomationJob).toHaveBeenCalledWith(expect.objectContaining({
            organizationId: org.id,
            leadId: lead.id,
            actionType: "AI_LEAD_ANALYSIS",
            executionId: execution?.id
        }));
    });

    it("Prevents Infinite Loops by denying duplicate event executions within the 5m threshold", async () => {
        vi.clearAllMocks();

        // Fire identical event again
        await evaluateAutomationsForEvent({
            eventId: "test-event-uuid-1", // duplicate delivery
            type: "LEAD_CREATED",
            organizationId: org.id,
            leadId: lead.id
        });

        // Producer should NOT be called again, the loop guard rejected the request natively in Prisma
        expect(producer.enqueueAutomationJob).not.toHaveBeenCalled();

        // Execution table should only have the FIRST record, not a second.
        const executions = await prisma.automationExecution.findMany({
            where: { leadId: lead.id }
        });
        expect(executions.length).toBe(1);
    });
});
