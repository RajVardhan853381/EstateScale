import { prisma } from '@/lib/prisma';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export default async function AutomationsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const { organization } = await requireOrganizationMember(params.slug);

  const [automations, recentExecutions] = await Promise.all([
    prisma.automation.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.automationExecution.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        automation: true,
        lead: { include: { contact: true } },
      },
    }),
  ]);

  const enabledCount = automations.filter((a) => a.enabled).length;
  const completedExecutions = recentExecutions.filter((e) => e.status === 'COMPLETED').length;
  const failedExecutions = recentExecutions.filter((e) => e.status === 'FAILED').length;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Event-Driven Workflows
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Automation Matrix
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure background triggers, CRM actions, and inspect BullMQ event dispatch telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/org/${params.slug}/journeys`}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all inline-flex items-center gap-1.5"
          >
            <span>Visual Journeys</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Triggers
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {enabledCount} / {automations.length}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Automations currently active
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Dispatched Jobs
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {recentExecutions.length}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Tracked in 50-job window
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Success Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {recentExecutions.length > 0
              ? `${Math.round((completedExecutions / recentExecutions.length) * 100)}%`
              : '100%'}
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Reliable idempotent execution</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Failed Jobs
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {failedExecutions}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Automatic retry with backoff
          </div>
        </div>
      </div>

      {/* Configured Automation Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            Active Automation Rules ({automations.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">Continuous Queue Mode</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {automations.map((auto) => (
            <div
              key={auto.id}
              className={`glass-panel p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                auto.enabled
                  ? 'border-indigo-200/80 hover:border-indigo-400 shadow-xs'
                  : 'border-slate-200/70 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-bold text-slate-900 text-base">{auto.name}</h3>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      auto.enabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {auto.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {auto.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-5">
                  {auto.description || 'Automated background CRM rule.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Trigger</span>
                  <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                    {auto.triggerType}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Action</span>
                  <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] border border-indigo-100">
                    {auto.actionType}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {automations.length === 0 && (
            <div className="col-span-full glass-panel p-10 text-center text-slate-400 space-y-2 rounded-2xl border border-slate-200/80">
              <Zap className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No Automations Configured</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Automations trigger background tasks when new leads are registered or stage changes occur.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Execution Log Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Recent Background Executions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live BullMQ queue logs and event dispatcher execution results.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">Latest 50 events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 font-bold">Execution ID</th>
                <th className="py-3.5 px-4 font-bold">Automation Rule</th>
                <th className="py-3.5 px-4 font-bold">Target Client</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {recentExecutions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    No background executions logged yet.
                  </td>
                </tr>
              ) : (
                recentExecutions.map((exec) => {
                  const clientName =
                    [exec.lead?.contact?.firstName, exec.lead?.contact?.lastName]
                      .filter(Boolean)
                      .join(' ') || 'Anonymous Lead';

                  return (
                    <tr
                      key={exec.id}
                      className="group hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 tabular-nums">
                        {exec.id.slice(0, 8)}...
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-xs text-slate-900">
                        {exec.automation.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {clientName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            exec.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : exec.status === 'FAILED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              exec.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : exec.status === 'FAILED'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                            }`}
                          />
                          {exec.status}
                        </span>
                        {exec.error && (
                          <p className="text-[11px] text-rose-600 mt-1 max-w-xs truncate" title={exec.error}>
                            {exec.error}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
                        {format(new Date(exec.createdAt), 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
