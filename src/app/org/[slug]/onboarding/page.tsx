import { prisma } from '@/lib/prisma';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { redirect } from 'next/navigation';


export default async function OnboardingContainerPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const slug = params.slug;

  const { organization, membership } = await requireOrganizationMember(slug);

  if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
    redirect(`/org/${slug}/dashboard`);
  }

  const setupState = await prisma.organizationSetupState.findUnique({
    where: { organizationId: organization.id },
  });

  if (!setupState || !setupState.isConfiguring) {
    redirect(`/org/${slug}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Ambient background blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/10 via-cyan-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto mb-8 text-center relative z-10 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs mb-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
            Tenant Initialization Wizard
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Welcome to EstateScale, {organization.name}
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Complete your brokerage configuration to initialize AI qualification, pipeline stages, and multi-channel journeys.
        </p>
      </div>

      <div className="relative z-10">
        <OnboardingWizard slug={slug} initialState={setupState} />
      </div>
    </div>
  );
}
