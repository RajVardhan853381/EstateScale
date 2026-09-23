import { listContacts } from '@/lib/services/contacts';
import { CreateContactModal } from '@/components/crm/CreateContactModal';
import { prisma } from '@/lib/prisma';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  Users,
  Search,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export default async function ContactsPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search || '';

  const { organization } = await requireOrganizationMember(params.slug);

  const [data, totalCount, multiLeadCount] = await Promise.all([
    listContacts(params.slug, {
      page,
      limit: 20,
    }),
    prisma.contact.count({
      where: { organizationId: organization.id },
    }),
    prisma.contact.count({
      where: {
        organizationId: organization.id,
        leads: { some: {} },
      },
    }),
  ]);

  const getInitials = (first?: string | null, last?: string | null) => {
    const f = first?.[0] || '';
    const l = last?.[0] || '';
    return (f + l).toUpperCase() || 'CT';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Directory &amp; CRM Master Index
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Client Contacts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centralized index of luxury buyers, property investors, and institutional partners.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CreateContactModal slug={params.slug} />
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
              Total Contacts
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
              {totalCount} Indexed
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Property Inquirers
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
              {multiLeadCount} Connected
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Multi-Tenant Isolated
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
              100% Encrypted
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Glass Panel */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xs border border-slate-200/80">
        {/* Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between">
          <form
            method="GET"
            action={`/org/${params.slug}/contacts`}
            className="relative w-full max-w-sm"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search contacts by name, email, phone..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200/90 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </form>
          <div className="text-xs text-slate-400 hidden sm:block">
            {totalCount} total contacts
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 font-bold">Contact Name</th>
                <th className="py-3.5 px-4 font-bold">Email</th>
                <th className="py-3.5 px-4 font-bold">Phone Number</th>
                <th className="py-3.5 px-4 font-bold text-center">Associated Deals</th>
                <th className="py-3.5 px-4 font-bold">Date Registered</th>
                <th className="py-3.5 px-4 font-bold text-right">Pipeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {data.contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mx-auto mb-3">
                      <Users className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      No Contacts in Directory
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                      Create your first client record to associate property inquiries and conversation histories.
                    </p>
                    <CreateContactModal slug={params.slug} />
                  </td>
                </tr>
              ) : (
                data.contacts.map((contact) => {
                  const fullName =
                    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
                    'Unnamed Contact';
                  const initials = getInitials(contact.firstName, contact.lastName);

                  return (
                    <tr
                      key={contact.id}
                      className="group hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex-shrink-0 shadow-xs">
                            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center font-bold text-xs text-slate-800">
                              {initials}
                            </div>
                          </div>
                          <div className="font-bold text-slate-900 text-sm">
                            {fullName}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{contact.email}</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {contact.phone ? (
                          <a
                            href={`tel:${contact.phone}`}
                            className="hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{contact.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>

                      {/* Deals Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {contact._count.leads} {contact._count.leads === 1 ? 'Lead' : 'Leads'}
                        </span>
                      </td>

                      {/* Date Added */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
                        {format(new Date(contact.createdAt), 'MMM dd, yyyy')}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/org/${params.slug}/leads?search=${encodeURIComponent(
                            contact.email || contact.lastName || contact.firstName || ''
                          )}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/80 shadow-2xs transition-all"
                        >
                          <span>Filter Leads</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
                  href={`/org/${params.slug}/contacts?page=${data.pagination.page - 1}`}
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
                  href={`/org/${params.slug}/contacts?page=${data.pagination.page + 1}`}
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
