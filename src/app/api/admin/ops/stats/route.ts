import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePlatformAdmin } from '@/lib/auth/platform-authorization';

export async function GET() {
  try {
    await requirePlatformAdmin();

    // Perform parallel queries for operational speed
    const [
      totalOrgs,
      activeUsers,
      aiUsageEvents,
      aiCostAggregate,
      aiByModel,
      aiByTask,
      automationsRunning,
      journeysWaiting,
      automationsFailed,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.aiUsage.count(),
      prisma.aiUsage.aggregate({ _sum: { estimatedCost: true } }),
      prisma.aiUsage.groupBy({
        by: ['model'],
        _count: { id: true },
        _sum: { estimatedCost: true },
      }),
      prisma.aiUsage.groupBy({
        by: ['operation'],
        _count: { id: true },
        _sum: { estimatedCost: true },
      }),
      prisma.automationExecution.count({ where: { status: 'PROCESSING' } }),
      prisma.journeyExecution.count({ where: { status: 'WAITING' } }),
      prisma.automationExecution.count({ where: { status: 'FAILED' } }),
    ]);

    return NextResponse.json({
      organizations: { total: totalOrgs },
      users: { total: activeUsers },
      ai: {
        totalExecutions: aiUsageEvents,
        totalCost: aiCostAggregate._sum.estimatedCost || 0,
        byModel: aiByModel.map((m) => ({
          model: m.model,
          count: m._count.id,
          cost: m._sum.estimatedCost || 0,
        })),
        byTask: aiByTask.map((t) => ({
          task: t.operation,
          count: t._count.id,
          cost: t._sum.estimatedCost || 0,
        })),
      },
      infrastructure: {
        automationsRunning,
        journeysWaiting,
        automationsFailed,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
