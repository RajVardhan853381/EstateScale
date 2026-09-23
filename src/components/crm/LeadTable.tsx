'use client';

import { LeadStatus, Prisma } from '@prisma/client';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

export type LeadForTable = Prisma.LeadGetPayload<{
  include: {
    contact: true;
    assignedUser: { include: { user: true } };
    pipelineStage: true;
  };
}> & {
  aiAssessments?: {
    score?: number | null;
    summary?: string | null;
  }[];
};

interface LeadTableProps {
  leads: LeadForTable[];
  organizationSlug: string;
}

export function LeadTable({ leads, organizationSlug }: LeadTableProps) {
  if (!leads.length) {
    return (
      <div className="py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mx-auto mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">No Leads Found</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
          No client leads match your criteria. Register a new lead or import a client portfolio to begin.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="stage-pill-new">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            <span>New Lead</span>
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="stage-pill-contacted">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Contacted</span>
          </span>
        );
      case 'QUALIFIED':
        return (
          <span className="stage-pill-qualified">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>Qualified</span>
          </span>
        );
      case 'FOLLOW_UP':
        return (
          <span className="stage-pill-contacted">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Follow Up</span>
          </span>
        );
      case 'APPOINTMENT_BOOKED':
        return (
          <span className="stage-pill-qualified">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            <span>Tour Booked</span>
          </span>
        );
      case 'CLOSED_WON':
        return (
          <span className="stage-pill-won">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Closed Won</span>
          </span>
        );
      case 'CLOSED_LOST':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Archived</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (!val) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getInitials = (first?: string | null, last?: string | null) => {
    const f = first?.[0] || '';
    const l = last?.[0] || '';
    return (f + l).toUpperCase() || 'CL';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
            <th className="py-3.5 px-4 font-bold">Client / Contact</th>
            <th className="py-3.5 px-4 font-bold">Property Interest</th>
            <th className="py-3.5 px-4 font-bold">Est. Valuation</th>
            <th className="py-3.5 px-4 font-bold">Stage &amp; Status</th>
            <th className="py-3.5 px-4 font-bold">AI Intent Score</th>
            <th className="py-3.5 px-4 font-bold">Assigned Advisor</th>
            <th className="py-3.5 px-4 font-bold">Created</th>
            <th className="py-3.5 px-4 font-bold text-right">Dossier</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {leads.map((lead) => {
            const fullName =
              [lead.contact?.firstName, lead.contact?.lastName].filter(Boolean).join(' ') ||
              'Anonymous Lead';
            const initials = getInitials(lead.contact?.firstName, lead.contact?.lastName);
            const aiScore = lead.score ?? (lead.aiAssessments?.[0]?.score as number | undefined);

            return (
              <tr
                key={lead.id}
                className="group hover:bg-slate-50/70 transition-colors"
              >
                {/* Client / Contact */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 flex-shrink-0 shadow-xs">
                      <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center font-bold text-xs text-indigo-700">
                        {initials}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/org/${organizationSlug}/leads/${lead.id}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 transition-colors block truncate group-hover:text-indigo-600"
                      >
                        {fullName}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-slate-400 truncate mt-0.5">
                        {lead.contact?.email && (
                          <span className="truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {lead.contact.email}
                          </span>
                        )}
                        {lead.contact?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {lead.contact.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Property Interest */}
                <td className="py-3.5 px-4">
                  <div className="text-slate-800 font-medium text-xs">
                    {lead.propertyType || 'Residential Luxury'}
                  </div>
                  {lead.location && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[140px]">{lead.location}</span>
                    </div>
                  )}
                </td>

                {/* Est. Valuation */}
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs tabular-nums">
                  {formatCurrency(lead.budget)}
                </td>

                {/* Stage & Status */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {getStatusBadge(lead.status)}
                </td>

                {/* AI Intent Score */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {aiScore !== undefined && aiScore !== null ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/70 border border-indigo-100 text-indigo-700 text-xs font-bold font-mono">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>{aiScore}/100</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Pending AI</span>
                  )}
                </td>

                {/* Assigned Agent */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {lead.assignedUser?.user?.name ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                        {lead.assignedUser.user.name[0]}
                      </div>
                      <span>{lead.assignedUser.user.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                  )}
                </td>

                {/* Created Date */}
                <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500 font-mono tabular-nums">
                  {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                </td>

                {/* Dossier Link */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <Link
                    href={`/org/${organizationSlug}/leads/${lead.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/80 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>View Dossier</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
