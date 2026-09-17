import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/auth/platform-authorization";

export async function GET(req: Request) {
    try {
        await requirePlatformAdmin();
        const url = new URL(req.url);
        const search = url.searchParams.get("q") || "";

        const orgs = await prisma.organization.findMany({
            where: {
                name: { contains: search, mode: "insensitive" }
            },
            include: {
                _count: {
                    select: { memberships: true, leads: true }
                }
            },
            take: 50,
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(orgs);
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 403 });
    }
}
