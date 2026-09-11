import { prisma } from "@/lib/prisma";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { UnifiedInbox } from "@/components/crm/UnifiedInbox";

export default async function InboxPageContainer(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { organization } = await requireOrganizationMember(params.slug);

  const conversations = await prisma.conversation.findMany({
      where: { organizationId: organization.id },
      orderBy: { updatedAt: 'desc' },
      include: {
          contact: true,
          messages: {
              orderBy: { createdAt: 'desc' },
              take: 1
          }
      }
  });

  return (
      <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
          <UnifiedInbox
             conversations={conversations as unknown as []}
          />
      </div>
  );
}
