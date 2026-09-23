import { requireOrganizationMember } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import {
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Activity,
  ChevronRight,
  Layers,
} from 'lucide-react';

export default async function OrganizationDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let organization;
  let membership;

  try {
    const result = await requireOrganizationMember(slug);
    organization = result.organization;
    membership = result.membership;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('NEXT_REDIRECT') || error.message.includes('signin')) {
        throw error;
      }
      if (
        error.message === 'Organization not found' ||
        error.message === 'Forbidden: Not a member of this organization'
      ) {
        notFound();
      }
    }
    notFound();
  }

  // Fetch live dashboard analytics from PostgreSQL
  const [
    totalLeadsCount,
    statusGroups,
    recentLeads,
    totalValuationAgg,
    wonAgg,
    contactsCount,
  ] = await Promise.all([
    prisma.lead.count({ where: { organizationId: organization.id } }),
    prisma.lead.groupBy({
      by: ['status'],
      where: { organizationId: organization.id },
      _count: { id: true },
    }),
    prisma.lead.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        contact: true,
        assignedUser: { include: { user: true } },
        aiAssessments: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.lead.aggregate({
      where: { organizationId: organization.id },
      _sum: { budget: true },
    }),
    prisma.lead.aggregate({
      where: { organizationId: organization.id, status: 'CLOSED_WON' },
      _sum: { budget: true },
      _count: { id: true },
    }),
    prisma.contact.count({ where: { organizationId: organization.id } }),
  ]);

  const countsByStatus: Record<string, number> = {};
  statusGroups.forEach((g) => {
    countsByStatus[g.status] = g._count.id;
  });

  const activePipelineCount =
    (countsByStatus['NEW'] || 0) +
    (countsByStatus['CONTACTED'] || 0) +
    (countsByStatus['QUALIFIED'] || 0) +
    (countsByStatus['FOLLOW_UP'] || 0) +
    (countsByStatus['APPOINTMENT_BOOKED'] || 0);

  const totalValue = totalValuationAgg._sum.budget || 0;
  const wonValue = wonAgg._sum.budget || 0;
  const conversionRate =
    totalLeadsCount > 0
      ? (((wonAgg._count.id || 0) / totalLeadsCount) * 100).toFixed(1)
      : '0.0';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  // Funnel calculations
  const stages = [
    { label: 'New Intake', count: countsByStatus['NEW'] || 0, color: 'bg-cyan-500', barBg: 'bg-cyan-50' },
    { label: 'Contacted', count: countsByStatus['CONTACTED'] || 0, color: 'bg-indigo-500', barBg: 'bg-indigo-50' },
    { label: 'Qualified', count: countsByStatus['QUALIFIED'] || 0, color: 'bg-purple-500', barBg: 'bg-purple-50' },
    { label: 'In Negotiation', count: (countsByStatus['FOLLOW_UP'] || 0) + (countsByStatus['APPOINTMENT_BOOKED'] || 0), color: 'bg-amber-500', barBg: 'bg-amber-50' },
    { label: 'Closed Won', count: countsByStatus['CLOSED_WON'] || 0, color: 'bg-emerald-500', barBg: 'bg-emerald-50' },
  ];

  const maxStageCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Live Command Center
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            {organization.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <span>Role: <strong className="text-slate-800 font-semibold">{membership.role}</strong></span>
            <span>&bull;</span>
            <span className="text-indigo-600 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> High-Concurrence Isolated Tenant
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/org/${slug}/leads`}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all"
          >
            Pipeline View
          </Link>
          <CreateLeadModal slug={slug} />
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Pipeline Valuation */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Pipeline Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {formatCompactCurrency(totalValue)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              {wonValue > 0 ? formatCompactCurrency(wonValue) : '$0'}
            </span>
            <span>in closed revenue</span>
          </div>
        </div>

        {/* KPI 2: Active Leads */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Pipeline Leads
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {activePipelineCount}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-bold text-slate-700">{totalLeadsCount}</span>
            <span>total leads recorded</span>
          </div>
        </div>

        {/* KPI 3: Win / Conversion Rate */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Closing Win Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {conversionRate}%
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-bold text-slate-700">{wonAgg._count.id || 0}</span>
            <span>closed deals won</span>
          </div>
        </div>

        {/* KPI 4: Speed to Lead */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Speed to Lead (AI)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            &lt; 90s
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-emerald-700 font-medium">Auto SMS responder active</span>
          </div>
        </div>
      </div>

      {/* Pipeline Stage Distribution Funnel */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Pipeline Stage Distribution
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current flow of active client opportunities across transaction stages.
            </p>
          </div>
          <Link
            href={`/org/${slug}/leads`}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Inspect All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {stages.map((stage) => {
            const pct = Math.round((stage.count / maxStageCount) * 100);
            return (
              <div
                key={stage.label}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {stage.label}
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                    {stage.count}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stage.color}`}
                      style={{ width: `${Math.max(pct, stage.count > 0 ? 10 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split Grid: Priority Leads (2/3) + Autonomous AI & Ops (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Recent Priority Inquiries */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  High-Priority Active Leads
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest client inquiries ordered by engagement freshness.
                </p>
              </div>
              <Link
                href={`/org/${slug}/leads`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>View Full Pipeline</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentLeads.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No leads registered yet</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Register your first client lead to initialize automated qualification.
                </p>
                <CreateLeadModal slug={slug} />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLeads.map((lead) => {
                  const clientName =
                    [lead.contact?.firstName, lead.contact?.lastName].filter(Boolean).join(' ') ||
                    'Anonymous Lead';
                  const aiScore =
                    lead.score ?? (lead.aiAssessments?.[0]?.score as number | undefined);

                  return (
                    <div
                      key={lead.id}
                      className="py-3.5 flex items-center justify-between gap-4 group hover:bg-slate-50/60 rounded-xl px-2 -mx-2 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {clientName[0]}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/org/${slug}/leads/${lead.id}`}
                            className="text-sm font-bold text-slate-900 hover:text-indigo-600 truncate block group-hover:text-indigo-600 transition-colors"
                          >
                            {clientName}
                          </Link>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                            <span>{lead.propertyType || 'Residential'}</span>
                            {lead.location && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate">{lead.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {lead.budget && (
                          <div className="text-right hidden sm:block">
                            <div className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                              {formatCurrency(lead.budget)}
                            </div>
                            <div className="text-[10px] text-slate-400">Est. Budget</div>
                          </div>
                        )}

                        {aiScore !== undefined && aiScore !== null && (
                          <div className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[11px] font-bold font-mono text-indigo-700">
                            {aiScore}/100
                          </div>
                        )}

                        <Link
                          href={`/org/${slug}/leads/${lead.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200/80 mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Database holds {contactsCount} indexed contacts</span>
            <Link
              href={`/org/${slug}/contacts`}
              className="font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
            >
              Manage Contacts &rarr;
            </Link>
          </div>
        </div>

        {/* Right 1 col: AI Intelligence & Engine Status */}
        <div className="space-y-6">
          {/* AI Intelligence Card */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden bg-gradient-to-b from-white to-indigo-50/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">EstateScale AI Core</h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Autonomous multi-channel intake continuously parses incoming inquiries, analyzes intent, and suggests tailored response strategies.
            </p>

            <div className="space-y-2.5 mb-5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80">
                <span className="text-slate-600 font-medium">In-Process Engine</span>
                <span className="font-bold text-slate-900 font-mono">Zero-Redis Mode</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80">
                <span className="text-slate-600 font-medium">MLS Feed Sync</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Realtime Active
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80">
                <span className="text-slate-600 font-medium">SMS Auto-Responder</span>
                <span className="font-bold text-indigo-700 font-mono">Standby Ready</span>
              </div>
            </div>

            <Link
              href={`/org/${slug}/automations`}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Review Visual Journeys</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick Actions Panel */}
          <div className="glass-panel p-5 rounded-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Quick Operations
            </h3>
            <div className="space-y-2">
              <Link
                href={`/org/${slug}/contacts`}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/70 text-xs font-semibold text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>Open Client Directory</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                href={`/org/${slug}/journeys`}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/70 text-xs font-semibold text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>Interactive Workflow Canvas</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                href={`/org/${slug}/analytics`}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/70 text-xs font-semibold text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-cyan-500" />
                  <span>Analytics &amp; Cohort Metrics</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
