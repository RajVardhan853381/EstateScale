import { NextResponse } from "next/server";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    const slug = params.slug;

    const { organization, membership } = await requireOrganizationMember(slug);

    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();

    let updatedSettings = (organization.settings as Record<string, unknown>) || {};
    if (typeof updatedSettings !== 'object' || updatedSettings === null) {
      updatedSettings = {};
    }

    // Merge incoming partial updates
    const newSettings = {
        ...updatedSettings,
        ai: body.ai !== undefined ? body.ai : updatedSettings.ai,
        company: {
           ...(updatedSettings.company as object || {}),
           name: body.name || organization.name
        }
    };

    const settingsPayload = JSON.parse(JSON.stringify(newSettings));

    await prisma.organization.update({
        where: { id: organization.id },
        data: {
            name: body.name || organization.name,
            settings: settingsPayload
        }
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
