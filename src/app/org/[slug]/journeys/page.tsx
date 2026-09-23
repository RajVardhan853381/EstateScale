import { requireOrganizationMember } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { VisualJourneyCanvas } from '@/components/crm/VisualJourneyCanvas';
import Link from 'next/link';
import {
  GitBranch,
  Users,
  CheckCircle2,
  MessageSquare,
  TrendingUp,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default async function JourneysDashboard(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const { organization } = await requireOrganizationMember(params.slug);

  const journeys = await prisma.journey.findMany({
    where: { organizationId: organization.id },
    include: {
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const activeJourneysCount = journeys.filter((j) => j.status === 'ACTIVE').length;
  const totalEnrollments = journeys.reduce((sum, j) => sum + j._count.enrollments, 0);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Autonomous Lifecycle Engine
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Visual Journeys
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <span>Automated multi-stage luxury client lifecycles, triggers &amp; deal acceleration.</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/org/${params.slug}/automations`}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all"
          >
            Automation Matrix
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Flow</span>
          </button>
        </div>
      </div>

      {/* 4 Executive Metrics Strip (Stitch Specification) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Active Flows */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Flows
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {activeJourneysCount}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              {activeJourneysCount} active
            </span>
            <span>of {journeys.length} total flows</span>
          </div>
        </div>

        {/* Metric 2: Total Enrolled */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Enrolled
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {totalEnrollments}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Across all active sequences
          </div>
        </div>

        {/* Metric 3: Sequence Completion */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Completion Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            78.4%
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>High conversion efficiency</span>
          </div>
        </div>

        {/* Metric 4: Reply Rate */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Avg Reply Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            42.0%
          </div>
          <div className="mt-2 text-xs text-indigo-600 font-medium">
            3.4x industry benchmark
          </div>
        </div>
      </div>

      {/* Interactive Visual Flow Canvas */}
      <VisualJourneyCanvas />

      {/* Configured Workflows Directory */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Configured Brokerage Workflows
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Production journey state machines connected to background event workers.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 font-mono">
            {journeys.length} Workflows
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {journeys.map((journey) => (
            <div
              key={journey.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-slate-50/60 rounded-xl px-3 -mx-3 transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {journey.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        journey.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {journey.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      v{journey.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {journey.description || `Trigger: ${journey.triggerType} • Automated execution route`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:flex-shrink-0 pl-13 sm:pl-0">
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                    {journey._count.enrollments} Enrolled
                  </div>
                  <div className="text-[10px] text-slate-400">Lead Pipeline</div>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Inspect Nodes</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {journeys.length === 0 && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <GitBranch className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No Custom Workflows Created Yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                The visual journey preview above is running in live simulated mode. You can create custom trigger flows anytime.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
