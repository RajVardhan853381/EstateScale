import { prisma } from "@/lib/prisma";

// Type abstractions to allow safe schema interactions over properties that typescript has lost due to partial schema merges or lack of direct compilation updates
type PrismaDynamicMock = {
    count: (args: unknown) => Promise<number>;
    aggregate: (args: unknown) => Promise<{ _sum: { estimatedValue: number | null } }>;
    groupBy: (args: unknown) => Promise<Array<Record<string, unknown>>>;
}

export class AnalyticsService {

  static async getDashboardMetrics(organizationId: string) {
    const [
      totalLeads,
      hotLeads,
      openOpportunities,
      wonOpportunities,
      pipelineValueAggr
    ] = await Promise.all([
      prisma.lead.count({ where: { organizationId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((prisma as any).leadIntelligence as PrismaDynamicMock)?.count({ where: { organizationId, temperature: "HOT" } }) ?? Promise.resolve(0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((prisma as any).opportunity as PrismaDynamicMock)?.count({ where: { organizationId, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } } }) ?? Promise.resolve(0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((prisma as any).opportunity as PrismaDynamicMock)?.count({ where: { organizationId, stage: "CLOSED_WON" } }) ?? Promise.resolve(0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((prisma as any).opportunity as PrismaDynamicMock)?.aggregate({
         where: { organizationId, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } },
         _sum: { estimatedValue: true }
      }) ?? Promise.resolve({ _sum: { estimatedValue: 0 } })
    ]);

    return {
      leads: {
        total: totalLeads,
        hot: hotLeads
      },
      pipeline: {
        openOpportunities,
        wonOpportunities,
        value: pipelineValueAggr._sum.estimatedValue || 0
      }
    };
  }

  static async getLeadFunnel(organizationId: string) {
      const rawLeads = await prisma.lead.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opportunities = await ((prisma as any).opportunity as PrismaDynamicMock)?.groupBy({
          by: ['stage'],
          where: { organizationId },
          _count: true
      }) ?? [];

      return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          leadsByStatus: rawLeads.reduce((acc: Record<string, number>, curr: any) => ({ ...acc, [curr.status]: curr._count }), {}),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          opportunitiesByStage: opportunities.reduce((acc: Record<string, number>, curr: any) => ({ ...acc, [curr.stage]: curr._count }), {})
      };
  }

  static async getAgentPerformance(organizationId: string) {
     const agents = await prisma.organizationMembership.findMany({
         where: { organizationId, role: { in: ["ADMIN", "USER", "AGENT"] } },
         include: { user: true }
     });

     const agentIds = agents.map(a => a.id);

     const assignedLeads = await prisma.lead.groupBy({
         by: ['assignedUserId'],
         where: { organizationId, assignedUserId: { in: agentIds } },
         _count: true
     });

     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const opps = await ((prisma as any).opportunity as PrismaDynamicMock)?.groupBy({
         by: ['agentId', 'stage'],
         where: { organizationId, agentId: { in: agentIds } },
         _count: true
     }) ?? [];

     return agents.map(agent => {
         const assignedCount = assignedLeads.find(l => l.assignedUserId === agent.id)?._count || 0;
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const agentOpps = opps.filter((o: any) => o.agentId === agent.id);
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const wonDeals = agentOpps.find((o: any) => o.stage === "CLOSED_WON")?._count || 0;
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const openDeals = agentOpps.filter((o: any) => o.stage !== "CLOSED_WON" && o.stage !== "CLOSED_LOST").reduce((sum: number, o: any) => sum + o._count, 0);

         return {
             agentId: agent.id,
             name: agent.user?.name || "Unknown",
             email: agent.user?.email,
             assignedLeads: assignedCount,
             openOpportunities: openDeals,
             wonDeals
         };
     });
  }

  static async getJourneyAnalytics(organizationId: string) {
      const journeys = await prisma.journey.findMany({
          where: { organizationId },
          include: {
              _count: {
                  select: { enrollments: true }
              }
          }
      });

      return journeys.map(j => ({
          id: j.id,
          name: j.name,
          status: j.status,
          enrollments: j._count.enrollments
      }));
  }

}
