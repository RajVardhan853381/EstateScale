import { ReactNode } from 'react';
import { requirePlatformAdmin } from '@/lib/auth/platform-authorization';
import Link from 'next/link';
import { Shield, ArrowLeft, Activity, Layers, HeartPulse, Building2 } from 'lucide-react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePlatformAdmin(true);

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-slate-900 flex flex-col selection:bg-purple-500/20 selection:text-purple-900">
      {/* Top Governance Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center font-black text-white text-xs shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold tracking-wider uppercase text-purple-400 font-mono">
              EstateScale Sovereign Infrastructure
            </div>
            <div className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              <span>Platform Governance</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <Link
            href="/admin/ops"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Operations</span>
          </Link>
          <Link
            href="/admin/ops/health"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
            <span>Health</span>
          </Link>
          <Link
            href="/admin/ops/orgs"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tenants</span>
          </Link>
          <Link
            href="/admin/onboarding"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Onboarding</span>
          </Link>
          <div className="w-px h-4 bg-slate-700 mx-1 hidden sm:block" />
          <Link
            href="/org/select"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Workspaces</span>
          </Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
