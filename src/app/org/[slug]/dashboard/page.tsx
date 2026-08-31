import { requireOrganizationMember } from "@/lib/auth/authorization";
import { notFound } from "next/navigation";

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
      if (
        error.message === "Organization not found" ||
        error.message === "Forbidden: Not a member of this organization"
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
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">{organization.name} Dashboard</h1>
      <p>
        Welcome! Your role is: <strong>{membership.role}</strong>.
      </p>
      <p className="mt-4 text-gray-600">This data is securely isolated to your organization.</p>
    </div>
  );
}
