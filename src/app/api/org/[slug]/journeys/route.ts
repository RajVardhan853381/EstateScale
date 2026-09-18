import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationMember } from "@/lib/auth/authorization";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const membership = await requireOrganizationMember(resolvedParams.slug);

    const journeys = await prisma.journey.findMany({
       where: { organizationId: membership.organization.id },
       include: {
          _count: {
             select: { enrollments: true }
          }
       },
       orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(journeys);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }
}
