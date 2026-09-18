import { Prisma } from "@prisma/client";

type OrgWithDetails = Prisma.OrganizationGetPayload<{
  include: {
    setupState: true;
    _count: {
      select: { memberships: true; leads: true };
    };
  };
}>;

export function OrgTable({ orgs }: { orgs: OrgWithDetails[] }) {
  return (
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
  );
}
