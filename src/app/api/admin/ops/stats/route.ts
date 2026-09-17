import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/auth/platform-authorization";

export async function GET() {
    try {
        await requirePlatformAdmin();

        // Perform parallel queries for operational speed
        const [
            totalOrgs,
            activeUsers,
            aiUsageEvents,
            outboxPending
        ] = await Promise.all([
            prisma.organization.count(),
            prisma.user.count(),
            prisma.aiUsage.count(),
            prisma.outboxEvent.count({ where: { status: "PENDING" } })
        ]);

        return NextResponse.json({
            organizations: { total: totalOrgs },
            users: { total: activeUsers },
            ai: { totalExecutions: aiUsageEvents },
            infrastructure: { outboxPending }
        });

    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 403 });
    }
}
