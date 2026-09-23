import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, Shield, ArrowRight, PlusCircle, Activity } from 'lucide-react';

export default async function OrgSelectPage() {
  const user = await requireAuthenticatedUser();

  const [memberships, platformAdmin] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: { userId: user.id },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.platformAdmin.findUnique({
      where: { userId: user.id },
    }),
  ]);

  // If user only belongs to 1 org and is not a platform admin, redirect directly
  if (memberships.length === 1 && !platformAdmin) {
    redirect(`/org/${memberships[0].organization.slug}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Subtle Ambient Mesh */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-500/10 via-cyan-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto space-y-10 relative z-10">
        {/* Brand Link & Welcome Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2.5 mb-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Building2 className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              Estate<span className="text-indigo-600">Scale</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-600 font-mono">
              Signed in as {user.email}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Select Workspace
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Choose an institutional brokerage workspace or administrative governance console to continue.
          </p>
        </div>

        {/* Organizations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Brokerage Organizations ({memberships.length})
            </h2>
            <span className="text-xs text-slate-400 font-mono">Multi-Tenant Encrypted</span>
          </div>

          {memberships.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 text-center space-y-3 border border-slate-200/80">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-700">No Brokerage Workspaces Associated</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You are currently not enrolled in any organization. Contact your brokerage administrator for an invite.
              </p>
              {platformAdmin && (
                <p className="text-xs font-semibold text-purple-600 mt-2">
                  As a Platform Administrator, you can provision new organizations below.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {memberships.map(({ organization, role }) => {
                const orgInitials = organization.name
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'ES';

                return (
                  <Link
                    key={organization.id}
                    href={`/org/${organization.slug}/dashboard`}
                    className="glass-panel group p-6 rounded-2xl border border-slate-200/80 hover:border-indigo-400/80 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-xs">
                            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center font-extrabold text-sm text-indigo-700">
                              {orgInitials}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {organization.name}
                            </h3>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              /org/{organization.slug}
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                          {role}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Active MLS Feed Connected</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                      <span>Launch Workspace</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform Admin Tools Section */}
        {platformAdmin && (
          <div className="space-y-4 pt-6 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-purple-600 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                Platform Governance &amp; Infrastructure
              </h2>
              <span className="text-xs text-purple-600 font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200">
                SuperAdmin
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Link
                href="/admin/onboarding"
                className="glass-panel group p-6 rounded-2xl border border-purple-200/80 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                        Tenant Onboarding
                      </h3>
                      <span className="text-xs text-purple-600 font-medium">Provisioning Console</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-5">
                    Create client organizations, generate invitation tokens, and initialize default pipelines.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                  <span>Open Onboarding Control</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/admin/ops"
                className="glass-panel group p-6 rounded-2xl border border-purple-200/80 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                        Operations Center
                      </h3>
                      <span className="text-xs text-purple-600 font-medium">Telemetry &amp; Health</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-5">
                    Monitor global tenants, users, AI provider execution limits, and background queue events.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                  <span>Open Operations Center</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
