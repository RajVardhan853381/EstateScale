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
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{organization.name} Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">Welcome</h3>
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
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">Overview</h3>
          </div>
          <div className="p-6 pt-0">
            <p className="text-gray-600">More stats and overview data will go here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
