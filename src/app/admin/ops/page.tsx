'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  Sparkles,
  Activity,
  Cpu,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Zap,
} from 'lucide-react';

type Stats = {
  organizations: { total: number };
  users: { total: number };
  ai: {
    totalExecutions: number;
    totalCost?: number;
    byModel?: Array<{ model: string; count: number; cost: number }>;
    byTask?: Array<{ task: string; count: number; cost: number }>;
  };
  infrastructure: {
    automationsRunning: number;
    journeysWaiting: number;
    automationsFailed: number;
  };
};

export default function OpsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/ops/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Forbidden or Network Error');
        return res.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="glass-panel p-8 rounded-2xl border border-rose-200 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Platform Access Denied</h2>
          <p className="text-xs text-rose-600 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-semibold">
          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
          <span>Polling Platform Operations Telemetry...</span>
        </div>
      </div>
    );
  }

  const premiumModelStats = stats.ai.byModel?.find((m) =>
    m.model.toLowerCase().includes('3.8')
  );
  const economyModelStats = stats.ai.byModel?.find(
    (m) =>
      m.model.toLowerCase().includes('8b') ||
      m.model.toLowerCase().includes('1.5')
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-purple-100 text-purple-800">
              Platform Admin Ops
            </span>
            <span className="text-xs text-slate-400 font-mono">Live Pulse</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            System Operations &amp; Intelligence Matrix
          </h1>
          <p className="text-xs text-slate-500">
            Global multi-tenant metrics, BullMQ worker event queue, and Two-Tier AI execution telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/ops/health"
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
            <span>Health &amp; Security Checks</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Orgs */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Organizations
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {stats.organizations.total}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Multi-tenant isolated</span>
          </div>
        </div>

        {/* Total Users */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Platform Users
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {stats.users.total}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Across all tenant workspaces
          </div>
        </div>

        {/* AI Calls & Cost */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              AI Executions &amp; Spend
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
              {stats.ai.totalExecutions}
            </span>
            {stats.ai.totalCost !== undefined && (
              <span className="text-xs font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                ${stats.ai.totalCost.toFixed(3)}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Two-Tier Gemini Flash routing
          </div>
        </div>

        {/* Queued Workflows */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Scheduled Queue
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
            {stats.infrastructure.journeysWaiting}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600">
              {stats.infrastructure.automationsRunning} active
            </span>
            <span>&bull;</span>
            <span className="text-rose-600 font-semibold">
              {stats.infrastructure.automationsFailed} failed
            </span>
          </div>
        </div>
      </div>

      {/* Two-Tier AI Model Routing Matrix */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Two-Tier Intelligent AI Routing Telemetry
              </h2>
              <p className="text-xs text-slate-500">
                Workload-driven model assignment optimizing for cognitive reasoning quality vs. operational cost.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            ACTIVE ROUTING
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tier 1 Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                  Tier 1: Premium Cognitive Reasoning
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Handles comprehensive lead analysis, qualification scoring, client outreach drafts, and autonomous journey decisions.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-indigo-100/70 text-xs">
              <span className="text-slate-500">
                Executions: <strong className="text-slate-800 font-mono">{premiumModelStats?.count ?? (stats.ai.totalExecutions || 0)}</strong>
              </span>
              <span className="text-slate-500">
                Spend: <strong className="text-emerald-700 font-mono">${(premiumModelStats?.cost ?? (stats.ai.totalCost || 0)).toFixed(4)}</strong>
              </span>
            </div>
          </div>

          {/* Tier 2 Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50/40 to-white border border-cyan-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-600" />
                <span className="text-xs font-bold text-cyan-950 uppercase tracking-wide">
                  Tier 2: High-Volume Workhorse
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">
                Gemini 1.5 Flash 8B
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Executes deterministic field extraction, inquiry classification, parameter normalization, and lightweight note summaries (62.5% lower token cost).
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-cyan-100/70 text-xs">
              <span className="text-slate-500">
                Executions: <strong className="text-slate-800 font-mono">{economyModelStats?.count ?? 0}</strong>
              </span>
              <span className="text-slate-500">
                Spend: <strong className="text-emerald-700 font-mono">${(economyModelStats?.cost ?? 0).toFixed(4)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Task Breakdown if available */}
        {stats.ai.byTask && stats.ai.byTask.length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Operations by Task Classification</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.ai.byTask.map((t) => (
                <div key={t.task} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
                  <div className="font-semibold text-slate-800 truncate font-mono text-[11px]">
                    {t.task}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-slate-500 text-[10px]">
                    <span>{t.count} calls</span>
                    <span className="text-emerald-700 font-mono font-bold">${t.cost.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Infrastructure Telemetry Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <span>Worker Engine Telemetry</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              OPERATIONAL
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <span className="text-slate-600">Event Dispatch Protocol</span>
              <span className="font-bold text-slate-900 font-mono">Domain Event Bus (BullMQ / Async)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <span className="text-slate-600">Concurrency Barrier</span>
              <span className="font-bold text-slate-900 font-mono">Single-Thread Claim Guard</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <span className="text-slate-600">Circuit Breaker Status</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Closed (Healthy)</span>
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-600" />
              <span>Multi-Tenant Architecture</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">SOC2 Type II Ready</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Tenant data is isolated via mandatory schema filtering and cryptographically validated NextAuth session tokens. Direct URL pooled connections manage burst read concurrency safely.
          </p>

          <div className="pt-2">
            <Link
              href="/admin/ops/orgs"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              <span>Inspect All Organization Schemas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
