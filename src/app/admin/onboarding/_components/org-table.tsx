import { Prisma } from "@prisma/client";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

type OrgWithDetails = Prisma.OrganizationGetPayload<{
  include: {
    setupState: true;
    _count: {
      select: { memberships: true, leads: true };
    };
  };
}>;

export function OrgTable({ orgs }: { orgs: OrgWithDetails[] }) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
              <th className="py-3.5 px-4 font-bold">Organization</th>
              <th className="py-3.5 px-4 font-bold">Status</th>
              <th className="py-3.5 px-4 font-bold">Setup Milestone</th>
              <th className="py-3.5 px-4 font-bold text-center">Users</th>
              <th className="py-3.5 px-4 font-bold text-center">Leads</th>
              <th className="py-3.5 px-4 font-bold text-right">Portal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {orgs.map((org) => {
              const initials = org.name
                .split(" ")
                .map((w: string) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "ES";

              return (
                <tr key={org.id} className="group hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 flex-shrink-0 shadow-xs">
                        <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center font-bold text-xs text-purple-700">
                          {initials}
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{org.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">/org/{org.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        org.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          org.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                        }`}
                      />
                      {org.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono font-semibold text-slate-600">
                    {org.setupState ? org.setupState.currentStep : "COMPLETED"}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-xs font-bold text-slate-700">
                    {org._count.memberships}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-xs font-bold text-slate-700">
                    {org._count.leads}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/org/${org.slug}/dashboard`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-purple-50 hover:text-purple-700 border border-slate-200/80 shadow-2xs transition-colors"
                    >
                      <span>Launch</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-xs text-slate-400">
                  No organizations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
