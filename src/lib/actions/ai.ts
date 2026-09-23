'use server';

import { requireOrganizationMember } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { analyzeLead } from '@/lib/services/ai';
import { revalidatePath } from 'next/cache';
import { rateLimiter } from '@/lib/security/rate-limiter';

export async function requestAiAnalysis(slug: string, leadId: string) {
  try {
    const { organization } = await requireOrganizationMember(slug);

    // Rate limit: 15 AI requests per minute per organization
    const limit = rateLimiter.check(`ai:${organization.id}`, 15, 60000);
    if (!limit.success) {
      return {
        success: false,
        error: `AI analysis rate limit exceeded. Please wait ${Math.ceil(limit.resetInMs / 1000)}s before requesting more evaluations.`,
      };
    }

    // Verify the lead belongs to the org
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: organization.id },
    });

    if (!lead) throw new Error('Lead not found');

    // Perform analysis directly
    await analyzeLead(slug, leadId);

    revalidatePath(`/org/${slug}/leads/${leadId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error('AI Analysis failed', error);
    return { success: false, error: error instanceof Error ? error.message : 'AI Analysis failed' };
  }
}
