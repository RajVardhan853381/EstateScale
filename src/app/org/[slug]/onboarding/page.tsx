import { prisma } from "@/lib/prisma";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { redirect } from "next/navigation";

export default async function OnboardingContainerPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug;

  const { organization, membership } = await requireOrganizationMember(slug);

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    redirect(`/org/${slug}/dashboard`);
  }

  const setupState = await prisma.organizationSetupState.findUnique({
    where: { organizationId: organization.id }
  });

  if (!setupState || !setupState.isConfiguring) {
    redirect(`/org/${slug}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Welcome to EstateScale, {organization.name}!
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Let&apos;s get your workspace set up.
        </p>
      </div>

      <OnboardingWizard slug={slug} initialState={setupState} />
    </div>
  );
}
