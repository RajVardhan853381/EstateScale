import { NextResponse } from 'next/server';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { AnalyticsService } from '@/lib/analytics/service';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const resolvedParams = await params;
    const membership = await requireOrganizationMember(resolvedParams.slug);

    const [dashboard, funnel, agents, journeys] = await Promise.all([
      AnalyticsService.getDashboardMetrics(membership.organization.id),
      AnalyticsService.getLeadFunnel(membership.organization.id),
      AnalyticsService.getAgentPerformance(membership.organization.id),
      AnalyticsService.getJourneyAnalytics(membership.organization.id),
    ]);

    return NextResponse.json({
      dashboard,
      funnel,
      agents,
      journeys,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }
}
