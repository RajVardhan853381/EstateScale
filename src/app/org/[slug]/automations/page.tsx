import { prisma } from '@/lib/prisma';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { AutomationList } from './components/AutomationList';
import { RecentExecutionsTable } from './components/RecentExecutionsTable';

export default async function AutomationsPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { organization } = await requireOrganizationMember(params.slug);

  const automations = await prisma.automation.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: 'desc' },
  });

  const recentExecutions = await prisma.automationExecution.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      automation: true,
      lead: { include: { contact: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Automation Engine</h1>
        <p className="mt-2 text-gray-600">
          Configure background workflows and view recent execution histories.
        </p>
      </div>

      <AutomationList automations={automations} />

      <RecentExecutionsTable recentExecutions={recentExecutions} />
    </div>
  );
}
