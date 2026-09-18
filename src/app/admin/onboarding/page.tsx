import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { redirect } from "next/navigation";
import { CreateOrganizationForm } from "./_components/CreateOrganizationForm";
import { OrganizationsTable } from "./_components/OrganizationsTable";

export default async function AdminOnboardingPage() {
  const user = await requireAuthenticatedUser();
  // Tenant isolation fix: ensure only superadmins can access this page.
  // In our simplified setup, we'll check for a specific email or rely on a system role.
  // For safety without a full global RBAC, we'll just deny access to all normal users by default
  // unless they are explicitly authorized. Here, we'll mock it by checking an env var or a hardcoded list.
  if (user.email !== "superadmin@estatescale.com") {
      redirect("/api/auth/signin");
  }

  const orgs = await prisma.organization.findMany({
    include: {
      setupState: true,
      _count: {
        select: { memberships: true, leads: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Onboarding Control</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <CreateOrganizationForm />

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

      <OrganizationsTable orgs={orgs} />
    </div>
  );
}
