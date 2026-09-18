import { requireOrganizationMember } from '@/lib/auth/authorization';
import { AnalyticsService } from '@/lib/analytics/service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AnalyticsDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const membership = await requireOrganizationMember(resolvedParams.slug);

  const [dashboard, funnel, agents, journeys] = await Promise.all([
    AnalyticsService.getDashboardMetrics(membership.organization.id),
    AnalyticsService.getLeadFunnel(membership.organization.id),
    AnalyticsService.getAgentPerformance(membership.organization.id),
    AnalyticsService.getJourneyAnalytics(membership.organization.id),
  ]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Analytics & Business Intelligence</h1>

      {/* Top Level KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.leads.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-red-600">Hot Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboard.leads.hot}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-blue-600">Open Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboard.pipeline.openOpportunities}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-green-600">Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${dashboard.pipeline.value.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel & Agents */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>New Leads</span>{' '}
                <span className="font-bold">
                  {(funnel.leadsByStatus as Record<string, number>)['NEW'] || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm text-blue-600">
                <span>Qualified</span>{' '}
                <span className="font-bold">
                  {(funnel.leadsByStatus as Record<string, number>)['QUALIFIED'] || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm text-purple-600">
                <span>Negotiating</span>{' '}
                <span className="font-bold">
                  {(funnel.opportunitiesByStage as Record<string, number>)['NEGOTIATION'] || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Closed Won</span>{' '}
                <span className="font-bold">{dashboard.pipeline.wonOpportunities}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agents.map((agent) => (
                <div
                  key={agent.agentId}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-xs text-muted-foreground">{agent.email}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{agent.openOpportunities as number} Open Deals</div>
                    <div className="text-green-600 font-bold">{agent.wonDeals as number} Won</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Journey Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Journey Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {journeys.map((j) => (
              <div key={j.id} className="flex justify-between p-3 border rounded-md">
                <div className="font-medium">{j.name}</div>
                <div className="text-blue-600 font-bold">{j.enrollments} Enrollments</div>
              </div>
            ))}
            {journeys.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No journey analytics data available.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
