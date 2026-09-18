import { NextResponse } from "next/server";
import { OnboardingService } from "@/lib/services/onboarding";
import { requireOrganizationMember } from "@/lib/auth/authorization";

export async function POST(req: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    const slug = params.slug;

    const { membership } = await requireOrganizationMember(slug);

    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const org = await OnboardingService.activateOrganization(slug);

    return NextResponse.json({ success: true, org });

  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
