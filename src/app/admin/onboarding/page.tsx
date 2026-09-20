import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { redirect } from "next/navigation";
import { CreateOrgForm } from "./_components/create-org-form";
import { OrgTable } from "./_components/org-table";

export default async function AdminOnboardingPage() {
  const user = await requireAuthenticatedUser();

  // Tenant isolation fix: ensure only superadmins can access this page.
  if (user.email !== "superadmin@estatescale.com") {
      redirect("/api/auth/signin");
  }


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
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Onboarding Control</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <CreateOrgForm />

        <div className="bg-gray-50 p-6 rounded-lg border text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Instructions</h3>
          <p className="mb-2">Creating an organization will:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Initialize the CRM pipeline and default stages.</li>
            <li>Generate an invitation token for the admin email (if provided).</li>
            <li>Set the organization status to configuring.</li>
          </ul>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Organizations ({orgs.length})</h2>
      <OrgTable orgs={orgs} />
    </div>
  );
}
