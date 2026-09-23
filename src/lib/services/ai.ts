import { prisma } from '@/lib/prisma';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { AIProvider, getOperationalAIProvider } from '@/lib/ai/provider';
import {
  ComprehensiveLeadAnalysisSchema,
  LeadExtractionSchema,
  LeadClassificationSchema,
  LeadSummarySchema,
  JourneyDecisionSchema,
  constructAnalysisPrompt,
  SYSTEM_LEAD_ANALYSIS_PROMPT,
} from '@/lib/ai/prompts';
import { AI_CONFIG } from '@/lib/ai/config';
import { calculateAiCost } from '@/lib/ai/cost';
import { assertAiQuotaAvailable } from '@/lib/ai/guard';
import { LeadActivityType } from '@prisma/client';

export async function analyzeLead(
  slugOrOrgId: string,
  leadId: string,
  customProvider?: AIProvider,
  internalWorkerContext?: { bypassAuth: boolean; organizationId: string }
) {
  let organization;
  let membershipId: string | null = null;

  if (internalWorkerContext?.bypassAuth) {
    // Trusted internal execution (Background Worker)
    organization = await prisma.organization.findUnique({
      where: { id: internalWorkerContext.organizationId },
    });
    if (!organization) throw new Error('VALIDATION_ERROR: Organization not found');
    // No membership ID assigned for system operations
  } else {
    // User execution
    const authCtx = await requireOrganizationMember(slugOrOrgId);
    organization = authCtx.organization;
    membershipId = authCtx.membership.id;
  }

  // 1. Fetch Lead and ensure Tenant Ownership
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: organization.id },
    include: {
      contact: true,
      notes: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!lead) throw new Error('NOT_FOUND');

  // 2. Build Context
  let leadTextContext = lead.notesText || '';
  if (lead.notes.length > 0) {
    leadTextContext += '\n--- Notes ---\n' + lead.notes.map((n) => n.content).join('\n');
  }

  if (!leadTextContext.trim()) {
    throw new Error('VALIDATION_ERROR: Insufficient context to analyze lead.');
  }

  const contactInfo = `
Name: ${lead.contact?.firstName || ''} ${lead.contact?.lastName || ''}
Email: ${lead.contact?.email || 'Unknown'}
Phone: ${lead.contact?.phone || 'Unknown'}
Source: ${lead.source || 'Unknown'}
    `.trim();

  // 3. Trigger AI with Two-Tier Routing: LEAD_ANALYSIS -> Tier 1 (Gemini 3.8 Flash)
  const aiProvider =
    customProvider ||
    getOperationalAIProvider({
      extraction: {
        intent: 'BUY',
        budget: 650000,
        location: 'Metro Area',
        propertyType: 'SINGLE_FAMILY',
        timeline: '1_MONTH',
      },
      qualification: {
        qualificationStatus: 'QUALIFIED',
        qualificationReason: 'High intent verified based on active property interest and pre-approval timeline.',
      },
      score: {
        score: 88,
        scoreReasoning: 'Ready buyer with verified requirements and immediate purchase intent.',
      },
      response: {
        suggestedResponse:
          'Hello! Thanks for your interest. I have several premier listings that match your criteria and would be glad to arrange a walkthrough.',
      },
    });

  const fullPrompt = `${SYSTEM_LEAD_ANALYSIS_PROMPT}\n\n${constructAnalysisPrompt(organization.name, leadTextContext, contactInfo)}`;

  // Enforce tenant AI monthly budget guard dynamically using LEAD_ANALYSIS pricing
  await assertAiQuotaAvailable(organization.id, 'LEAD_ANALYSIS');

  const { object: aiResult, usage, modelUsed } = await aiProvider.generateStructuredOutput(
    fullPrompt,
    ComprehensiveLeadAnalysisSchema,
    { taskType: 'LEAD_ANALYSIS' }
  );

  // Compute exact token usage cost using the actual model that executed
  const estimatedCost = calculateAiCost(
    modelUsed,
    usage.inputTokens ?? 0,
    usage.outputTokens ?? 0
  );

  // 4. Update Database in Transaction safely
  const assessment = await prisma.$transaction(async (tx) => {
    // Track Cost/Usage explicitly scoped to org and classified by task
    await tx.aiUsage.create({
      data: {
        organizationId: organization.id,
        provider: AI_CONFIG.provider,
        model: modelUsed,
        operation: 'LEAD_ANALYSIS',
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        estimatedCost,
      },
    });

    // Accumulate monthly spend on organization
    const updatedOrg = await tx.organization.update({
      where: { id: organization.id },
      data: {
        currentMonthAiSpend: { increment: estimatedCost },
      },
      select: {
        currentMonthAiSpend: true,
        monthlyAiBudgetUsd: true,
        aiQuotaExceeded: true,
      },
    });

    if (!updatedOrg.aiQuotaExceeded && updatedOrg.currentMonthAiSpend >= updatedOrg.monthlyAiBudgetUsd) {
      await tx.organization.update({
        where: { id: organization.id },
        data: { aiQuotaExceeded: true },
      });
    }

    // Store the detailed analysis independently to keep main lead table clean
    const assessment = await tx.aiAssessment.create({
      data: {
        organizationId: organization.id,
        leadId: lead.id,
        intent: aiResult.extraction.intent,
        qualificationStatus: aiResult.qualification.qualificationStatus,
        qualificationReason: aiResult.qualification.qualificationReason,
        score: aiResult.score.score,
        scoreReasoning: aiResult.score.scoreReasoning,
        suggestedResponse: aiResult.response.suggestedResponse,
        model: modelUsed,
      },
    });

    // Mutate actual CRM Lead with extracted data explicitly, avoiding overwrites if lead already has manual info
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        intent: lead.intent || aiResult.extraction.intent,
        budget: lead.budget || aiResult.extraction.budget,
        location: lead.location || aiResult.extraction.location,
        propertyType: lead.propertyType || aiResult.extraction.propertyType,
        timeline: lead.timeline || aiResult.extraction.timeline,
        score: aiResult.score.score,
      },
    });

    // Add an activity indicating AI processed this lead
    await tx.leadActivity.create({
      data: {
        organizationId: organization.id,
        leadId: lead.id,
        userId: membershipId || null, // Will be null if triggered by automated system worker
        type: LeadActivityType.SYSTEM,
        description: `AI Lead Assessment completed (Score: ${aiResult.score.score})`,
      },
    });

    return assessment;
  }, { timeout: 15000 });

  await import('@/lib/events/bus').then((m) =>
    m.publishDomainEvent({
      eventId: crypto.randomUUID(),
      organizationId: organization.id,
      leadId: lead.id,
      type: 'AI_ANALYSIS_COMPLETED',
      metadata: { score: aiResult.score.score },
    })
  );

  return assessment;
}

async function recordAiUsageAndSpend(
  organizationId: string,
  operation: string,
  modelUsed: string,
  usage: { inputTokens?: number; outputTokens?: number },
  estimatedCost: number
) {
  await prisma.$transaction(async (tx) => {
    await tx.aiUsage.create({
      data: {
        organizationId,
        provider: AI_CONFIG.provider,
        model: modelUsed,
        operation,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        estimatedCost,
      },
    });

    const updatedOrg = await tx.organization.update({
      where: { id: organizationId },
      data: {
        currentMonthAiSpend: { increment: estimatedCost },
      },
      select: {
        currentMonthAiSpend: true,
        monthlyAiBudgetUsd: true,
        aiQuotaExceeded: true,
      },
    });

    if (!updatedOrg.aiQuotaExceeded && updatedOrg.currentMonthAiSpend >= updatedOrg.monthlyAiBudgetUsd) {
      await tx.organization.update({
        where: { id: organizationId },
        data: { aiQuotaExceeded: true },
      });
    }
  });
}

/**
 * Fast deterministic lead data extraction.
 * Routes to Tier 2 (Economy: gemini-1.5-flash-8b) with automatic fallback to Tier 1.
 */
export async function extractLeadData(
  organizationId: string,
  rawText: string,
  customProvider?: AIProvider
) {
  await assertAiQuotaAvailable(organizationId, 'EXTRACTION');

  const provider =
    customProvider ||
    getOperationalAIProvider({
      intent: 'BUY',
      budget: 500000,
      location: 'Suburbs',
      propertyType: 'Single Family',
      timeline: '3 months',
    });

  const prompt = `Extract structured real estate purchasing parameters from this inquiry:\n\n${rawText}`;
  const { object, usage, modelUsed } = await provider.generateStructuredOutput(
    prompt,
    LeadExtractionSchema,
    { taskType: 'EXTRACTION' }
  );

  const estimatedCost = calculateAiCost(modelUsed, usage.inputTokens ?? 0, usage.outputTokens ?? 0);

  await recordAiUsageAndSpend(
    organizationId,
    'EXTRACTION',
    modelUsed,
    usage,
    estimatedCost
  );

  return object;
}

/**
 * Fast lead intent & sentiment classification.
 * Routes to Tier 2 (Economy: gemini-1.5-flash-8b) with automatic fallback to Tier 1.
 */
export async function classifyLeadIntent(
  organizationId: string,
  messageText: string,
  customProvider?: AIProvider
) {
  await assertAiQuotaAvailable(organizationId, 'CLASSIFICATION');

  const provider =
    customProvider ||
    getOperationalAIProvider({
      intent: 'BUY',
      urgency: 'HIGH',
      sentiment: 'POSITIVE',
      optOutDetected: false,
    });

  const prompt = `Classify the intent, urgency, sentiment, and opt-out signal of this message:\n\n${messageText}`;
  const { object, usage, modelUsed } = await provider.generateStructuredOutput(
    prompt,
    LeadClassificationSchema,
    { taskType: 'CLASSIFICATION' }
  );

  const estimatedCost = calculateAiCost(modelUsed, usage.inputTokens ?? 0, usage.outputTokens ?? 0);

  await recordAiUsageAndSpend(
    organizationId,
    'CLASSIFICATION',
    modelUsed,
    usage,
    estimatedCost
  );

  return object;
}

/**
 * Generates personalized customer-facing sales communication draft.
 * Routes to Tier 1 (Premium: gemini-3.8-flash) for maximum nuance and conversion quality.
 */
export async function generateOutreachResponse(
  organizationId: string,
  leadId: string,
  contextNote?: string,
  customProvider?: AIProvider
): Promise<string> {
  await assertAiQuotaAvailable(organizationId, 'OUTREACH_GENERATION');

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: { contact: true },
  });

  if (!lead) throw new Error('NOT_FOUND');

  const provider =
    customProvider ||
    getOperationalAIProvider('Hello! Thanks for your interest. How can I assist you with your home search?');

  const prompt = `
Generate a professional, concise, sales-oriented SMS response addressed directly to the client.
Client Name: ${lead.contact?.firstName || 'there'}
Intent: ${lead.intent || 'buying property'}
Budget: ${lead.budget ? `$${lead.budget}` : 'unspecified'}
Location: ${lead.location || 'preferred area'}
Additional Context: ${contextNote || lead.notesText || 'No extra notes'}

Draft response directly (do not add quotes or preamble):
  `.trim();

  const { text, usage, modelUsed } = await provider.generateString(prompt, {
    taskType: 'OUTREACH_GENERATION',
  });

  const estimatedCost = calculateAiCost(modelUsed, usage.inputTokens ?? 0, usage.outputTokens ?? 0);

  await recordAiUsageAndSpend(
    organizationId,
    'OUTREACH_GENERATION',
    modelUsed,
    usage,
    estimatedCost
  );

  return text;
}

/**
 * Autonomous journey step decision evaluation.
 * Routes to Tier 1 (Premium: gemini-3.8-flash) to evaluate complex branch conditions.
 */
export async function evaluateJourneyDecision(
  organizationId: string,
  decisionCriteria: string,
  leadContext: Record<string, unknown>,
  customProvider?: AIProvider
) {
  await assertAiQuotaAvailable(organizationId, 'AI_DECISION');

  const provider =
    customProvider ||
    getOperationalAIProvider({
      decision: true,
      reasoning: 'Criteria satisfied based on high purchasing readiness',
      confidence: 90,
    });

  const prompt = `
You are an autonomous CRM Workflow Decision Engine.
Evaluate the following lead data against the criteria and decide whether to take the TRUE or FALSE path.

CRITERIA:
${decisionCriteria}

LEAD CONTEXT:
${JSON.stringify(leadContext, null, 2)}
  `.trim();

  const { object, usage, modelUsed } = await provider.generateStructuredOutput(
    prompt,
    JourneyDecisionSchema,
    { taskType: 'AI_DECISION' }
  );

  const estimatedCost = calculateAiCost(modelUsed, usage.inputTokens ?? 0, usage.outputTokens ?? 0);

  await recordAiUsageAndSpend(
    organizationId,
    'AI_DECISION',
    modelUsed,
    usage,
    estimatedCost
  );

  return object;
}

/**
 * Lightweight lead activity and conversation history summarization.
 * Routes to Tier 2 (Economy: gemini-1.5-flash-8b) with automatic fallback to Tier 1.
 */
export async function summarizeLeadHistory(
  organizationId: string,
  leadId: string,
  customProvider?: AIProvider
) {
  await assertAiQuotaAvailable(organizationId, 'SIMPLE_SUMMARY');

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: {
      notes: { take: 10, orderBy: { createdAt: 'desc' } },
      activities: { take: 10, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!lead) throw new Error('NOT_FOUND');

  const provider =
    customProvider ||
    getOperationalAIProvider({
      summary: 'Active buyer looking for single family homes with quick turnaround.',
      keyPoints: ['Budget confirmed', 'Pre-approval in progress', 'Follow up scheduled'],
    });

  const notesText = lead.notes.map((n) => n.content).join('\n');
  const activitiesText = lead.activities.map((a) => a.description).join('\n');

  const prompt = `
Summarize this lead's interactions and activity history into a concise summary with key points:
Notes:
${notesText || 'No notes'}

Activities:
${activitiesText || 'No recorded activities'}
  `.trim();

  const { object, usage, modelUsed } = await provider.generateStructuredOutput(
    prompt,
    LeadSummarySchema,
    { taskType: 'SIMPLE_SUMMARY' }
  );

  const estimatedCost = calculateAiCost(modelUsed, usage.inputTokens ?? 0, usage.outputTokens ?? 0);

  await recordAiUsageAndSpend(
    organizationId,
    'SIMPLE_SUMMARY',
    modelUsed,
    usage,
    estimatedCost
  );

  return object;
}

