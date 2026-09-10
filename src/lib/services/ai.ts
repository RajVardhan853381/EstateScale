import { prisma } from '@/lib/prisma';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { AIProvider, OpenAIProvider } from '@/lib/ai/provider';
import {
  ComprehensiveLeadAnalysisSchema,
  constructAnalysisPrompt,
  SYSTEM_LEAD_ANALYSIS_PROMPT,
} from '@/lib/ai/prompts';
import { AI_CONFIG } from '@/lib/ai/config';
import { LeadActivityType } from '@prisma/client';
import { checkAndIncrementQuota, checkRateLimit } from '@/lib/rate-limit/redis';
import logger from '@/lib/logger';
import { incrementMetric } from '@/lib/metrics';
import { getRequestId } from '@/lib/correlation';

export async function analyzeLead(
  slugOrOrgId: string,
  leadId: string,
  customProvider?: AIProvider,
  internalWorkerContext?: { bypassAuth: boolean; organizationId: string }
) {
  const reqId = await getRequestId();
  const log = logger.child({ reqId, module: 'ai-service', leadId });

  let organization;
  let membershipId: string | null = null;

  if (internalWorkerContext?.bypassAuth) {
    organization = await prisma.organization.findUnique({
      where: { id: internalWorkerContext.organizationId },
    });
    if (!organization) throw new Error('VALIDATION_ERROR: Organization not found');
  } else {
    const authCtx = await requireOrganizationMember(slugOrOrgId);
    organization = authCtx.organization;
    membershipId = authCtx.membership.id;
  }

  log.info({ organizationId: organization.id, isInternal: !!internalWorkerContext }, 'Initiating Lead AI Analysis');
  incrementMetric('aiRequests');

  try {
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

    if (!customProvider) {
      await checkRateLimit(`ai:tenant:${organization.id}`, { limit: 5, windowSec: 60 });
      await checkAndIncrementQuota(organization.id, 'ai_analysis');
    }

    const aiProvider = customProvider || new OpenAIProvider();
    const fullPrompt = `${SYSTEM_LEAD_ANALYSIS_PROMPT}\n\n${constructAnalysisPrompt(organization.name, leadTextContext, contactInfo)}`;

    const { object: aiResult, usage } = await aiProvider.generateStructuredOutput(
      fullPrompt,
      ComprehensiveLeadAnalysisSchema,
      AI_CONFIG.defaultModel
    );

    log.info({ score: aiResult.score.score, intent: aiResult.extraction.intent }, 'AI Analysis complete');

    return await prisma.$transaction(async (tx) => {
      await tx.aiUsage.create({
        data: {
          organizationId: organization.id,
          provider: 'openai',
          model: AI_CONFIG.defaultModel,
          operation: 'analyze_lead',
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          estimatedCost: 0,
        },
      });

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
          model: AI_CONFIG.defaultModel,
        },
      });

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

      await tx.leadActivity.create({
        data: {
          organizationId: organization.id,
          leadId: lead.id,
          userId: membershipId || null,
          type: LeadActivityType.SYSTEM,
          description: `AI Lead Assessment completed (Score: ${aiResult.score.score})`,
        },
      });

      return assessment;
    });
  } catch (err: unknown) {
    log.error({ err: err instanceof Error ? err.message : 'Unknown Error' }, 'AI Analysis failed');
    incrementMetric('aiFailures');
    throw err;
  }
}
