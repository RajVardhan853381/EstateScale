import { requireOrganizationMember } from "@/lib/auth/authorization";
import { CopilotChat } from "@/components/ai/CopilotChat";

export default async function CopilotPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { organization } = await requireOrganizationMember(params.slug);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI Copilot</h1>
        <p className="mt-2 text-gray-600">Your intelligent real estate assistant with secure access to your CRM data.</p>
      </div>

      <CopilotChat slug={organization.slug} />
    </div>
  );
}
