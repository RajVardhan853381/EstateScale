'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

type Org = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  _count: { memberships: number; leads: number };
};

export default function ManageOrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/admin/ops/orgs?q=${encodeURIComponent(search)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setOrgs(data);
        });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
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
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Tenant Directory
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Organization Tenants ({orgs.length})
          </h1>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Orgs Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 font-bold">Organization</th>
                <th className="py-3.5 px-4 font-bold">Slug URL</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-center">Members</th>
                <th className="py-3.5 px-4 font-bold text-center">Leads</th>
                <th className="py-3.5 px-4 font-bold">Created</th>
                <th className="py-3.5 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {orgs.map((org) => {
                const initials = org.name
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'ES';

                return (
                  <tr
                    key={org.id}
                    className="group hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 flex-shrink-0 shadow-xs">
                          <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center font-bold text-xs text-purple-700">
                            {initials}
                          </div>
                        </div>
                        <span className="font-bold text-slate-900 text-xs">{org.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      /org/{org.slug}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          org.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {org.status === 'ACTIVE' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        {org.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-xs font-bold text-slate-700">
                      {org._count.memberships}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-xs font-bold text-slate-700">
                      {org._count.leads}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/org/${org.slug}/dashboard`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-purple-50 hover:text-purple-700 border border-slate-200/80 shadow-2xs transition-colors"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {orgs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    No organizations match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
