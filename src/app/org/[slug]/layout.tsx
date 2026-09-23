import { ReactNode } from 'react';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { OrgSidebar } from '@/components/layout/OrgSidebar';
import { redirect, notFound } from 'next/navigation';

export default async function OrganizationLayout(props: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  let result;
  try {
    result = await requireOrganizationMember(slug);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('NEXT_REDIRECT')) {
        throw error;
      }
      if (error.message.includes('Organization not found')) {
        notFound();
      }
      if (error.message.includes('Forbidden') || error.message.includes('Not a member')) {
        redirect('/org/select');
      }
    }
    redirect(`/login?callbackUrl=/org/${slug}`);
  }

  const { organization, user, membership } = result;

  let isPlatformAdmin = false;
  if (user?.id) {
    const pa = await prisma.platformAdmin.findUnique({
      where: { userId: user.id },
    });
    isPlatformAdmin = !!pa;
  }

  return (
    <div className="flex h-screen bg-[#F8F9FF] text-slate-900 overflow-hidden">
      <OrgSidebar
        slug={slug}
        orgName={organization.name}
        userEmail={user.email || ''}
        userRole={membership.role}
        isPlatformAdmin={isPlatformAdmin}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1">
          {props.children}
        </div>
      </main>
    </div>
  );
}
