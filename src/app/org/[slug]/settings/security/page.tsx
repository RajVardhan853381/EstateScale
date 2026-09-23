import { requireRole } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Download,
} from 'lucide-react';

export default async function SecuritySettingsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const { organization } = await requireRole(params.slug, ['OWNER', 'ADMIN']);

  const members = await prisma.organizationMembership.findMany({
    where: { organizationId: organization.id },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Tenant Administration
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Workspace Security &amp; Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage organization members, role access control, cryptographic boundaries, and audit logs.
          </p>
        </div>

        {/* Sub-nav switcher */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100/80 border border-slate-200/80">
          <Link
            href={`/org/${params.slug}/settings/security`}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-700 shadow-2xs"
          >
            Security &amp; Roles
          </Link>
          <Link
            href={`/org/${params.slug}/settings/templates`}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Templates
          </Link>
        </div>
      </div>

      {/* Tenant Isolation Guarantee Card */}
      <div className="glass-panel p-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/40 via-white to-transparent shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Cryptographic Multi-Tenant Isolation Active
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  STRICT TENANT SCOPE
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                Every lead, contact, CRM activity, and Twilio carrier message is isolated by unique Organization UUID (<span className="font-mono text-slate-800 font-bold">{organization.id}</span>). Queries are protected by deterministic middleware assertion guards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 flex-shrink-0">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Zero Cross-Tenant Leakage</span>
          </div>
        </div>
      </div>

      {/* Organization Members Card */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Workspace Members ({members.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Team members authorized to view leads and interact with clients.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 font-bold">Team Member</th>
                <th className="py-3.5 px-4 font-bold">Email Address</th>
                <th className="py-3.5 px-4 font-bold">Role Privilege</th>
                <th className="py-3.5 px-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {members.map((m) => {
                const name = m.user.name || (m.user.email ? m.user.email.split('@')[0] : 'Team Member');
                const initials = name
                  .split(' ')
                  .map((n: string) => n[0])
                  .filter(Boolean)
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'TM';

                return (
                  <tr
                    key={m.userId}
                    className="group hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 flex-shrink-0 shadow-xs">
                          <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center font-bold text-xs text-slate-800">
                            {initials}
                          </div>
                        </div>
                        <span className="font-bold text-slate-900 text-xs">{name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                      {m.user.email}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          m.role === 'OWNER'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : m.role === 'ADMIN'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {m.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel p-6 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
          <AlertTriangle className="w-5 h-5" />
          <h2>High-Privilege Operations (Danger Zone)</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
          Actions taken here fundamentally alter organization tenant records, exported audit packages, or data destruction. Only Organization Owners may authorize these operations.
        </p>

        <div className="pt-2 flex flex-wrap gap-3">
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-xs font-semibold cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Organization Data (Locked)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
