import { getLead } from '@/lib/services/leads';
import { listLeadActivities } from '@/lib/services/activities';
import { prisma } from '@/lib/prisma';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { LeadActivityTimeline } from '@/components/crm/LeadActivityTimeline';
import { AiLeadAssessment } from '@/components/crm/AiLeadAssessment';
import { ConversationThread } from '@/components/crm/ConversationThread';
import { LeadStatusSelector, LeadNoteComposer } from '@/components/crm/LeadDetailActions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Building2,
  Mail,
  Phone,
  DollarSign,
  MapPin,
  Calendar,
  Clock,
  Tag as TagIcon,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

export default async function LeadDetailPage(props: {
  params: Promise<{ slug: string; leadId: string }>;
}) {
  const params = await props.params;
  let lead: Awaited<ReturnType<typeof getLead>>;
  let activities: Awaited<ReturnType<typeof listLeadActivities>>;
  let messages: {
    id: string;
    body: string;
    direction: 'INBOUND' | 'OUTBOUND';
    status: string;
    createdAt: Date;
  }[] = [];
  let isOptedOut = false;

  try {
    const { organization } = await requireOrganizationMember(params.slug);

    const [leadRes, activitiesRes, conversationRes] = await Promise.all([
      getLead(params.slug, params.leadId),
      listLeadActivities(params.slug, params.leadId),
      prisma.conversation.findFirst({
        where: { organizationId: organization.id, leadId: params.leadId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
    ]);

    lead = leadRes;
    activities = activitiesRes;

    if (conversationRes) {
      messages = conversationRes.messages;
      isOptedOut = conversationRes.status === 'OPT_OUT';
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('signin') || msg.includes('NEXT_REDIRECT')) {
      throw error;
    }
    notFound();
  }

  const clientName =
    [lead.contact?.firstName, lead.contact?.lastName].filter(Boolean).join(' ') ||
    'Anonymous Client';
  const initials = (
    (lead.contact?.firstName?.[0] || '') + (lead.contact?.lastName?.[0] || '')
  ).toUpperCase() || 'CL';

  const formatCurrency = (val: number | null | undefined) => {
    if (!val) return 'Not Specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation & Breadcrumb */}
      <div>
        <Link
          href={`/org/${params.slug}/leads`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-3 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Leads Pipeline</span>
        </Link>
      </div>

      {/* Lead Hero Profile Bar */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-sm shadow-indigo-500/20 flex-shrink-0">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center font-extrabold text-base text-indigo-700">
              {initials}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                {clientName}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                ID: {lead.id.slice(-6).toUpperCase()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
              {lead.contact?.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <a
                    href={`mailto:${lead.contact.email}`}
                    className="hover:text-indigo-600 transition-colors"
                  >
                    {lead.contact.email}
                  </a>
                </span>
              )}
              {lead.contact?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <a
                    href={`tel:${lead.contact.phone}`}
                    className="hover:text-indigo-600 transition-colors"
                  >
                    {lead.contact.phone}
                  </a>
                </span>
              )}
              <span className="flex items-center gap-1.5 font-mono tabular-nums">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Created {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Live Status Selector */}
        <div className="flex items-center gap-3">
          <LeadStatusSelector
            slug={params.slug}
            leadId={lead.id}
            currentStatus={lead.status}
          />
        </div>
      </div>

      {/* Main Grid: 2-Column Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): AI Assessment + Communication + Buyer Specifications + Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cognitive AI Assessment */}
          <AiLeadAssessment
            slug={params.slug}
            leadId={lead.id}
            assessment={lead.aiAssessments?.[0]}
          />

          {/* SMS Channel */}
          <ConversationThread
            organizationSlug={params.slug}
            leadId={lead.id}
            messages={messages}
            isOptedOut={isOptedOut}
          />

          {/* Property Specifications Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/70">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Property Specifications &amp; Criteria
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Estimated Valuation / Budget
                </div>
                <div className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                  {formatCurrency(lead.budget)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Target Property Type
                </div>
                <div className="text-base font-extrabold text-slate-900">
                  {lead.propertyType || 'Single Family Luxury'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  Target Location / Submarket
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {lead.location || 'Flexible / Metro Area'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                  Acquisition Timeline
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {lead.timeline || '1-3 Months'}
                </div>
              </div>
            </div>

            {lead.notesText && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/60 text-xs">
                <div className="font-bold text-amber-900 mb-1">Intake Inquiries &amp; Preferences:</div>
                <p className="text-amber-800 leading-relaxed">{lead.notesText}</p>
              </div>
            )}
          </div>

          {/* Private Advisor Memos & Notes */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/70">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Private Advisor Memos ({lead.notes.length})
              </h2>
            </div>

            <div className="mb-5">
              <LeadNoteComposer slug={params.slug} leadId={lead.id} />
            </div>

            {lead.notes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No internal memos logged yet.</p>
            ) : (
              <div className="space-y-3">
                {lead.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/70 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5 font-bold text-slate-800">
                      <span>{note.user?.user?.name || 'Advisor'}</span>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): Pipeline Status + Advisor Assignment + Tags + Activity Timeline */}
        <div className="space-y-6">
          {/* Assignment & Routing Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-100">
              Portfolio Routing
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Assigned Senior Advisor</span>
                {lead.assignedUser?.user?.name ? (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                      {lead.assignedUser.user.name[0]}
                    </div>
                    <span className="font-bold text-slate-900">{lead.assignedUser.user.name}</span>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-400 italic">
                    Unassigned (Pool Queue)
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Active Pipeline</span>
                <div className="font-bold text-slate-800 p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                  {lead.pipeline?.name || 'Default Residential Funnel'}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Pipeline Stage</span>
                <div className="font-bold text-slate-800 p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                  {lead.pipelineStage?.name || 'Intake Qualification'}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Acquisition Source</span>
                <div className="font-bold text-slate-800 p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                  {lead.source || 'Direct MLS Web Intake'}
                </div>
              </div>
            </div>
          </div>

          {/* Tags Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <TagIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Segment Tags
              </h3>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {lead.tags.length === 0 ? (
                <span className="text-xs text-slate-400">No segment tags attached.</span>
              ) : (
                lead.tags.map((t) => (
                  <span
                    key={t.tag.id}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    #{t.tag.name}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Timeline Activity */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-100">
              Audit &amp; Activity Log
            </h3>
            <LeadActivityTimeline activities={activities} />
          </div>
        </div>
      </div>
    </div>
  );
}
