import './setup-mocks';
vi.mock("next-auth", () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })
}));
import { describe, it, expect, vi, beforeEach } from "vitest";
import { triggerSmsSend } from "../../src/lib/actions/sms";
import { prisma } from "../../src/lib/prisma";
import { enqueueAutomationJob } from "../../src/lib/queue/producer";
import { executeSendSms } from "../../src/lib/services/communication";
import * as authorization from "../../src/lib/auth/authorization";
import { OrganizationMembership } from "@prisma/client";

vi.mock("../../src/lib/queue/producer", () => ({
    enqueueAutomationJob: vi.fn(),
    automationQueue: { add: vi.fn() },
    AUTOMATION_QUEUE_NAME: "test-queue"
}));

async function getTestUser() {
    return await prisma.user.create({
        data: { email: "test-comm-" + Date.now() + "@example.com", name: "Test User" }
    });
}

async function createTestOrganization(userId: string) {
    return await prisma.organization.create({
        data: {
            name: "Test Org " + Date.now(),
            slug: "test-org-" + Date.now(),
            memberships: {
                create: { userId, role: "OWNER" }
            }
        }
    });
}

async function createTestLead(organizationId: string) {
    const pipeline = await prisma.pipeline.create({
        data: {
            organizationId,
            name: "Default Pipeline",
            stages: {
                create: [{ organizationId, name: "New", order: 1 }]
            }
        },
        include: { stages: true }
    });

    const contact = await prisma.contact.create({
        data: {
            organizationId,
            firstName: "John",
            lastName: "Doe",
            phone: "+1234567890"
        }
    });

    const lead = await prisma.lead.create({
        data: {
            organizationId,
            contactId: contact.id,
            pipelineId: pipeline.id,
            pipelineStageId: pipeline.stages[0].id
        }
    });

    return { lead, contact, pipeline };
}

describe("Communication Engine Architecture", () => {
    beforeEach(async () => {
        await prisma.message.deleteMany();
        await prisma.conversation.deleteMany();
        await prisma.organizationCommunicationConfig.deleteMany();
        await prisma.organizationMembership.deleteMany();
        await prisma.organization.deleteMany();
        await prisma.user.deleteMany();
        vi.clearAllMocks();
    });

    it("Successfully initiates manual SMS queue execution distinguishing from automation", async () => {
        const user = await getTestUser();
        const org = await createTestOrganization(user.id);
        const { lead, contact } = await createTestLead(org.id);

        vi.spyOn(authorization, 'requireOrganizationMember').mockResolvedValue({
            user: user as NonNullable<Awaited<ReturnType<typeof authorization.getCurrentUser>>>,
            organization: org,
            membership: { role: "MEMBER" } as unknown as OrganizationMembership
        });

        const result = await triggerSmsSend(org.slug, lead.id, "Integration Test Message");
        expect(result.success).toBe(true);

        const message = await prisma.message.findFirst({
            where: { organizationId: org.id, to: contact.phone! }
        });

        expect(message).toBeDefined();
        expect(message?.status).toBe("QUEUED");
        expect(message?.body).toBe("Integration Test Message");

        expect(enqueueAutomationJob).toHaveBeenCalledWith(expect.objectContaining({
            actionType: "MANUAL_SMS",
            organizationId: org.id,
            leadId: lead.id,
            messageId: message!.id
        }));
    });

    it("Sends a manual SMS through executeSendSms exactly matching inputs safely", async () => {
        const user = await getTestUser();
        const org = await createTestOrganization(user.id);
        const { lead, contact } = await createTestLead(org.id);

        await prisma.organizationCommunicationConfig.create({
            data: {
                organizationId: org.id,
                phoneNumber: "+19998887777"
            }
        });

        const conversation = await prisma.conversation.create({
            data: {
                organizationId: org.id,
                leadId: lead.id,
                contactId: contact.id,
                channel: "SMS"
            }
        });

        const message = await prisma.message.create({
             data: {
                organizationId: org.id,
                conversationId: conversation.id,
                direction: "OUTBOUND",
                status: "QUEUED",
                provider: "TWILIO",
                from: "PENDING",
                to: contact.phone!,
                body: "Manual Content"
            }
        });

        await executeSendSms(org.id, lead.id, "ignored fallback content", message.id);

        const updatedMessage = await prisma.message.findUnique({ where: { id: message.id } });
        expect(updatedMessage?.status).toBe("SENT");
        expect(updatedMessage?.from).toBe("+19998887777");
        expect(updatedMessage?.externalId).toBeDefined();
    });
});
