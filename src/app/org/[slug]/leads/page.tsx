import { listLeads } from '@/lib/services/leads';
import { LeadTable } from '@/components/crm/LeadTable';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import { prisma } from '@/lib/prisma';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import Link from 'next/link';
import {
  Users,
  Search,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default async function LeadsPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search || '';
  const statusFilter = searchParams.status || 'ALL';

  const { organization } = await requireOrganizationMember(params.slug);

  const [data, stats, activeCount] = await Promise.all([
    listLeads(params.slug, {
      page,
      limit: 15,
      search: search || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
    }),
    prisma.lead.aggregate({
      where: { organizationId: organization.id },
      _count: { id: true },
      _sum: { budget: true },
    }),
    prisma.lead.count({
      where: {
        organizationId: organization.id,
        status: { in: ['NEW', 'CONTACTED', 'QUALIFIED', 'FOLLOW_UP', 'APPOINTMENT_BOOKED'] },
      },
    }),
  ]);

  const totalValueFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(stats._sum.budget || 0);

  const statusTabs = [
    { label: 'All Leads', value: 'ALL' },
    { label: 'New Intake', value: 'NEW' },
    { label: 'Contacted', value: 'CONTACTED' },
    { label: 'Qualified', value: 'QUALIFIED' },
    { label: 'Follow Up', value: 'FOLLOW_UP' },
    { label: 'Closed Won', value: 'CLOSED_WON' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Client Pipeline
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Leads Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Live client pipeline with automated MLS valuation and predictive AI scoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CreateLeadModal slug={params.slug} />
        </div>
      </div>

      {/* Metric Quick Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Database
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
              {stats._count.id} Leads
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active In-Pipeline
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
              {activeCount} Active
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pipeline Valuation
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
              {totalValueFormatted}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xs border border-slate-200/80">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.value;
              const href = `/org/${params.slug}/leads?status=${tab.value}${
                search ? `&search=${encodeURIComponent(search)}` : ''
              }`;

              return (
                <Link
                  key={tab.value}
                  href={href}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Search Input Form */}
          <form
            method="GET"
            action={`/org/${params.slug}/leads`}
            className="relative w-full md:w-72"
          >
            {statusFilter !== 'ALL' && (
              <input type="hidden" name="status" value={statusFilter} />
            )}
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by name, email, phone..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200/90 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </form>
        </div>

        {/* Lead Table */}
        <LeadTable leads={data.leads} organizationSlug={params.slug} />

        {/* Pagination Footer */}
        {data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing Page <span className="font-bold text-slate-800">{data.pagination.page}</span>{' '}
              of <span className="font-bold text-slate-800">{data.pagination.totalPages}</span> (
              {data.pagination.total} total)
            </div>

            <div className="flex items-center gap-2">
              {data.pagination.page > 1 ? (
                <Link
                  href={`/org/${params.slug}/leads?page=${data.pagination.page - 1}${
                    statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''
                  }${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 text-slate-300 font-semibold cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              )}

              {data.pagination.page < data.pagination.totalPages ? (
                <Link
                  href={`/org/${params.slug}/leads?page=${data.pagination.page + 1}${
                    statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''
                  }${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 text-slate-300 font-semibold cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
