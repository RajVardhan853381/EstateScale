import { requireOrganizationMember } from '@/lib/auth/authorization';
import { AnalyticsService } from '@/lib/analytics/service';
import {
  BarChart3,
  TrendingUp,
  Flame,
  Briefcase,
  DollarSign,
  Users,
  GitBranch,
} from 'lucide-react';

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Business Intelligence &amp; Performance
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Analytics &amp; Cohorts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time conversion velocity, deal volume, and agent performance tracking.
          </p>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Intake
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {dashboard.leads.total}
          </div>
          <p className="text-xs text-slate-500 mt-1">Indexed client leads</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
              High Intent (Hot)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-rose-600 font-mono tracking-tight tabular-nums">
            {dashboard.leads.hot}
          </div>
          <p className="text-xs text-slate-500 mt-1">Score &gt; 80 or immediate timeline</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600">
              Active Opportunities
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {dashboard.pipeline.openOpportunities}
          </div>
          <p className="text-xs text-slate-500 mt-1">Live negotiations &amp; tours</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Pipeline Valuation
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-emerald-700 font-mono tracking-tight tabular-nums">
            {formatCurrency(dashboard.pipeline.value)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Unweighted pipeline gross</p>
        </div>
      </div>

      {/* Funnel & Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Funnel */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200/80">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Lead Funnel Distribution</h2>
              <p className="text-xs text-slate-500 mt-0.5">Progression through acquisition pipeline stages.</p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 text-xs">
              <span className="font-semibold text-slate-700">New Intake</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {(funnel.leadsByStatus as Record<string, number>)['NEW'] || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-50/50 border border-cyan-100 text-xs">
              <span className="font-semibold text-cyan-900">Qualified</span>
              <span className="font-mono font-bold text-cyan-700 text-sm">
                {(funnel.leadsByStatus as Record<string, number>)['QUALIFIED'] || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs">
              <span className="font-semibold text-indigo-900">Negotiating / Tours</span>
              <span className="font-mono font-bold text-indigo-700 text-sm">
                {(funnel.opportunitiesByStage as Record<string, number>)['NEGOTIATION'] || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs">
              <span className="font-semibold text-emerald-900">Closed Won</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {dashboard.pipeline.wonOpportunities}
              </span>
            </div>
          </div>
        </div>

        {/* Agent Performance */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200/80">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Advisor Leaderboard</h2>
              <p className="text-xs text-slate-500 mt-0.5">Deals closed and active pipeline by agent.</p>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>

          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.agentId}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    {agent.name?.[0] || 'A'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{agent.name}</div>
                    <div className="text-[11px] text-slate-400">{agent.email}</div>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-medium text-slate-600">{agent.openOpportunities as number} Active Deals</div>
                  <div className="text-emerald-600 font-bold font-mono">{agent.wonDeals as number} Won</div>
                </div>
              </div>
            ))}
            {agents.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No advisor metrics recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Journey Analytics */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Automated Journey Enrollments</h2>
            <p className="text-xs text-slate-500 mt-0.5">Execution volume across multi-stage automated workflows.</p>
          </div>
          <GitBranch className="w-5 h-5 text-slate-400" />
        </div>

        <div className="space-y-3">
          {journeys.map((j) => (
            <div
              key={j.id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-white transition-colors"
            >
              <div className="font-bold text-slate-800 text-xs">{j.name}</div>
              <div className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-bold text-xs">
                {j.enrollments} Enrollments
              </div>
            </div>
          ))}
          {journeys.length === 0 && (
            <div className="text-xs text-slate-400 text-center py-8">
              No journey analytics data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
