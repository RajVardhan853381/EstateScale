import { Worker, Job } from "bullmq";
import { AUTOMATION_QUEUE_NAME, AutomationJobPayload } from "./lib/queue/producer";
import { redisClient } from "./lib/queue/client";
import { prisma } from "./lib/prisma";
import { analyzeLead } from "./lib/services/ai";

console.log("🚀 Starting EstateScale Background Worker process...");

const processJob = async (job: Job<AutomationJobPayload>) => {
    const { organizationId, leadId, actionType, executionId } = job.data;
    console.log(`[Worker] Processing Job ${job.id} (Action: ${actionType}) for Lead ${leadId}`);

    // State 1: Acknowledge processing cleanly before making any expensive AI calls outside a transaction
    await prisma.automationExecution.update({
        where: { id: executionId, organizationId },
        data: { status: "PROCESSING", startedAt: new Date() }
    });

    try {
        // Validate cross-tenant boundary natively prior to any API invocations
        const lead = await prisma.lead.findFirst({
            where: { id: leadId, organizationId }
        });

        if (!lead) {
            throw new Error(`Tenant Isolation or Validation Failure: Lead ${leadId} not found in Organization ${organizationId}`);
        }

        if (actionType === "AI_LEAD_ANALYSIS") {
            // Execution occurs *outside* a database transaction! Prisma calls inside the service are atomic
            // and handled independently, preventing locking timeouts on external LLM services.
            await performInternalAIAnalysis(organizationId, leadId);
        } else if (actionType === "AI_LEAD_RESPONSE_GENERATION") {
             await performInternalAIAnalysis(organizationId, leadId);
        } else {
             throw new Error(`Unknown actionType: ${actionType}`);
        }

        // State 2: Finalize upon successful execution returns
        await prisma.automationExecution.update({
            where: { id: executionId, organizationId },
            data: { status: "COMPLETED", completedAt: new Date() }
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown Worker Error";
        console.error(`[Worker] Job ${job.id} failed:`, msg);

        // State 3: Hard failure registration
        await prisma.automationExecution.update({
            where: { id: executionId, organizationId },
            data: { status: "FAILED", error: msg }
        });

        // Bubble error to BullMQ to handle retry/backoff
        throw err;
    }
};

// Extracted worker-specific secure logic mapped without req/res Auth overlays
async function performInternalAIAnalysis(organizationId: string, leadId: string) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId }});
    if(!org) throw new Error("Org not found");

    // Execute the domain service bypassing the front-door HTTP auth bounds safely because
    // the worker runs with trusted parameters retrieved deterministically from the queue.
    await analyzeLead(org.slug, leadId, undefined, { bypassAuth: true, organizationId });
}

const worker = new Worker(AUTOMATION_QUEUE_NAME, processJob, {
    connection: redisClient,
    concurrency: 5, // Process max 5 jobs simultaneously per worker node to protect rate limits
});

worker.on("completed", (job) => {
    console.log(`✅ [Worker] Job ${job.id} completed successfully.`);
});

worker.on("failed", (job, err) => {
    console.error(`❌ [Worker] Job ${job?.id} failed with error: ${err.message}`);
});

// Graceful Shutdown mechanisms
const shutdown = async () => {
    console.log("Shutting down worker gracefully...");
    await worker.close();
    await redisClient.quit();
    process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
