import { requireOrganizationMember } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import BillingPageClient from "./page.client";

export default async function BillingPageContainer(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { organization } = await requireOrganizationMember(params.slug);

  const sub = await prisma.subscription.findUnique({
      where: { organizationId: organization.id }
  });

  return (
      <BillingPageClient
          slug={params.slug}
          currentPlan={sub?.plan || "FREE"}
          status={sub?.status || "INCOMPLETE"}
          hasPaymentMethod={!!sub?.stripeCustomerId}
      />
  );
}
