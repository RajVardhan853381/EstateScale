import { requireOrganizationMember } from '@/lib/auth/authorization';
import { notFound } from 'next/navigation';

export default async function OrganizationDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let organization;
  let membership;

  try {
    const result = await requireOrganizationMember(slug);
    organization = result.organization;
    membership = result.membership;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('NEXT_REDIRECT') || error.message.includes('signin')) {
        throw error;
      }
      if (
        error.message === 'Organization not found' ||
        error.message === 'Forbidden: Not a member of this organization'
      ) {
        notFound();
      }

      return (
        <div className="p-8 text-red-600">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p>{error.message}</p>
        </div>
      );
    }
    return (
      <div className="p-8 text-red-600">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>An unknown error occurred</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 mb-3 rounded-full bg-slate-100 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">EstateScale Global Intelligence &bull; Real-time MLS Synced</span>
          </div>
          <div className="p-6 pt-0">
            <p>
              Your role is: <strong>{membership.role}</strong>.
            </p>
            <p className="mt-4 text-gray-600">
              This data is securely isolated to your organization.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Cpu className="w-16 h-16 text-indigo-600" /></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Tokens Consumption</h3>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><Cpu className="w-4 h-4" /></div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">84.2k</span>
              <span className="text-sm font-medium text-slate-400">/ 100k cap</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full" style={{ width: '84.2%' }}></div>
            </div>
            <p className="text-xs font-medium text-slate-500">15.8k tokens remaining &bull; Auto-refills in 6d</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Calendar className="w-16 h-16 text-indigo-600" /></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasks Due Today</h3>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center"><Bell className="w-4 h-4" /></div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">7</span>
              <span className="inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">2 overdue</span>
            </div>
            <p className="text-xs font-medium text-slate-500">High-priority closings &amp; 3 property tours</p>
          </div>
        </div>
      </div>
    </div>
  );
}
