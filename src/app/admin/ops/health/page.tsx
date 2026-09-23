'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  HeartPulse,
  Database,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type HealthStatus = {
  status: string;
  db: string;
  redis: string;
};

export default function SystemHealthPage() {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(() => {
    setRefreshing(true);
    fetch('/api/ready')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ status: 'DOWN', db: 'DOWN', redis: 'DOWN' }))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/ready')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setStatus(data);
      })
      .catch(() => {
        if (mounted) setStatus({ status: 'DOWN', db: 'DOWN', redis: 'DOWN' });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const isHealthy = status?.status === 'UP';

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <Link
            href="/admin/ops"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Operations Center</span>
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Dependency Diagnostic Matrix
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            System Health Matrix
          </h1>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={refreshing}
          onClick={fetchHealth}
          className="text-xs font-semibold gap-1.5 h-9 px-4 rounded-xl cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
          <span>Ping Dependencies</span>
        </Button>
      </div>

      {/* Overall Health Card */}
      <div
        className={`glass-panel p-6 rounded-2xl border transition-all ${
          isHealthy
            ? 'border-emerald-200/80 bg-gradient-to-r from-emerald-50/40 via-white to-transparent'
            : 'border-rose-200/80 bg-rose-50/30'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Platform Core Readiness</div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated via continuous readiness probe endpoint (<span className="font-mono text-[11px]">/api/ready</span>)
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide ${
              isHealthy
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}
            />
            {status?.status || 'POLLING'}
          </span>
        </div>
      </div>

      {/* Dependency Subsystems Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Subsystem Dependencies
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* PostgreSQL Database */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">PostgreSQL (Prisma)</div>
                <div className="text-xs text-slate-400">Direct pooled multi-tenant DB</div>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                status?.db === 'UP'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {status?.db === 'UP' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {status?.db || '...'}
            </span>
          </div>

          {/* Redis / Upstash BullMQ */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center flex-shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Redis (BullMQ)</div>
                <div className="text-xs text-slate-400">Job queue &amp; rate limit cache</div>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                status?.redis === 'UP'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {status?.redis === 'UP' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {status?.redis || '...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
