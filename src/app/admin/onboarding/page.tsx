import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { OnboardingService } from "@/lib/services/onboarding";
import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";

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

  async function createOrgAction(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const adminEmail = formData.get("adminEmail") as string;

    if (!name || !slug) return;

    await OnboardingService.createOrganization({ name, slug, adminEmail });
    revalidatePath("/admin/onboarding");
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Onboarding Control</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">Create New Organization</h2>
          <form action={createOrgAction} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" name="name" required className="w-full border rounded p-2" placeholder="Acme Real Estate" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug (URL)</label>
              <input type="text" name="slug" required className="w-full border rounded p-2" placeholder="acme" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Primary Admin Email</label>
              <input type="email" name="adminEmail" className="w-full border rounded p-2" placeholder="admin@acme.com" />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Create Organization
            </button>
          </form>
        </div>

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
      <div className="bg-white rounded-lg shadow overflow-hidden border">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-sm">Organization</th>
              <th className="p-4 font-semibold text-sm">Status</th>
              <th className="p-4 font-semibold text-sm">Setup Step</th>
              <th className="p-4 font-semibold text-sm">Users</th>
              <th className="p-4 font-semibold text-sm">Leads</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map(org => (
              <tr key={org.id} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-medium">{org.name}</div>
                  <div className="text-xs text-gray-500">/{org.slug}</div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {org.status}
                  </span>
                </td>
                <td className="p-4 text-sm">
                  {org.setupState ? org.setupState.currentStep : "UNKNOWN"}
                </td>
                <td className="p-4 text-sm">{org._count.memberships}</td>
                <td className="p-4 text-sm">{org._count.leads}</td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No organizations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
