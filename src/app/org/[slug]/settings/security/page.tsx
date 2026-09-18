import { requireRole } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';

export default async function SecuritySettingsPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { organization } = await requireRole(params.slug, ['OWNER', 'ADMIN']);

  const members = await prisma.organizationMembership.findMany({
    where: { organizationId: organization.id },
    include: { user: true },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Security & Organization Settings</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
        <h2 className="text-xl font-semibold mb-4">Organization Members</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b p-2 font-medium text-slate-600">Name</th>
              <th className="border-b p-2 font-medium text-slate-600">Email</th>
              <th className="border-b p-2 font-medium text-slate-600">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td className="border-b p-2">{m.user.name || 'N/A'}</td>
                <td className="border-b p-2">{m.user.email}</td>
                <td className="border-b p-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 text-sm rounded">
                    {m.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-red-600">Danger Zone</h2>
        <p className="text-slate-600 mb-4">
          Actions in this area affect the fundamental data of the organization.
        </p>
        <button
          disabled
          className="px-4 py-2 bg-red-100 text-red-600 rounded font-medium opacity-50 cursor-not-allowed"
        >
          Export Organization Data (Locked)
        </button>
      </div>
    </div>
  );
}
