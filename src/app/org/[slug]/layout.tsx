import Link from 'next/link';
import { ReactNode } from 'react';
import { requireOrganizationMember } from '@/lib/auth/authorization';

export default async function OrganizationLayout(props: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  let organization;
  try {
    const result = await requireOrganizationMember(slug);
    organization = result.organization;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message.includes('NEXT_REDIRECT') || error.message.includes('signin'))
    ) {
      throw error;
    }
    // Let page components handle the rest
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 font-semibold text-lg">
          {organization?.name || 'EstateScale'}
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link
            href={`/org/${slug}/dashboard`}
            className="flex items-center px-2 py-2 text-sm font-medium rounded-md hover:bg-gray-50 text-gray-700"
          >
            Dashboard
          </Link>
          <Link
            href={`/org/${slug}/leads`}
            className="flex items-center px-2 py-2 text-sm font-medium rounded-md hover:bg-gray-50 text-gray-700"
          >
            Leads
          </Link>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 justify-between md:hidden">
          <div className="font-semibold">{organization?.name || 'EstateScale'}</div>
        </header>
        <div className="flex-1 overflow-auto bg-gray-50">{props.children}</div>
      </main>
    </div>
  );
}
