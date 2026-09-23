import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/auth/platform-authorization";
import { CreateOrgForm } from "./_components/create-org-form";
import { OrgTable } from "./_components/org-table";
import { Shield, CheckCircle2, Layers } from "lucide-react";

export default async function AdminOnboardingPage() {
  await requirePlatformAdmin(true);

  const orgs = await prisma.organization.findMany({
    include: {
      setupState: true,
      _count: {
        select: { memberships: true, leads: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-widest font-mono">
            Provisioning Console
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
          Tenant Onboarding &amp; Provisioning
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Create new client organizations, generate administrator invitation tokens, and initialize default pipelines.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <CreateOrgForm />

        <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Shield className="w-4 h-4 text-purple-600" />
            <h3>Automated Provisioning Workflow</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            When you register a new tenant organization, the following cryptographic steps are automatically executed:
          </p>
          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Initializes the default CRM transaction pipeline and 6 baseline stages.</span>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Generates a secure 48-hour invitation token for the primary admin email.</span>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Attaches isolated tenant database schema scope and BullMQ queues.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Provisioned Tenant Organizations ({orgs.length})</span>
        </h2>
        <OrgTable orgs={orgs} />
      </div>
    </div>
  );
}
