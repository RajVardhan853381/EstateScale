import { NextResponse } from "next/server";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { BillingService } from "@/lib/billing/service";

export async function POST(req: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    const slug = params.slug;

    const { organization, membership } = await requireOrganizationMember(slug);

    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { action, priceId } = await req.json();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.get("host")}`;
    const returnUrl = `${baseUrl}/org/${slug}/billing`;

    if (action === "checkout" && priceId) {
        const session = await BillingService.createCheckoutSession(organization.id, priceId, returnUrl, returnUrl);
        return NextResponse.json({ url: session.url });
    } else if (action === "portal") {
        const session = await BillingService.createBillingPortalSession(organization.id, returnUrl);
        return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
