import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';

export class AnalyticsService {
  static async getDashboardMetrics(organizationId: string) {
    const [totalLeads, hotLeads, openOpportunities, wonOpportunities, pipelineValueAggr] =
      await Promise.all([
        prisma.lead.count({
          where: { organizationId, deletedAt: null },
        }),
        prisma.lead.count({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { score: { gte: 80 } },
              { aiAssessments: { some: { qualificationStatus: 'HOT' } } },
            ],
          },
        }),
        prisma.lead.count({
          where: {
            organizationId,
            deletedAt: null,
            status: { notIn: [LeadStatus.CLOSED_WON, LeadStatus.CLOSED_LOST] },
          },
        }),
        prisma.lead.count({
          where: {
            organizationId,
            deletedAt: null,
            status: LeadStatus.CLOSED_WON,
          },
        }),
        prisma.lead.aggregate({
          where: {
            organizationId,
            deletedAt: null,
            status: { notIn: [LeadStatus.CLOSED_WON, LeadStatus.CLOSED_LOST] },
          },
          _sum: { budget: true },
        }),
      ]);

    return {
      leads: {
        total: totalLeads,
        hot: hotLeads,
      },
      pipeline: {
        openOpportunities,
        wonOpportunities,
        value: pipelineValueAggr?._sum?.budget || 0,
      },
    };
  }

  static async getLeadFunnel(organizationId: string) {
    const rawLeads = await prisma.lead.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: true,
    });

    const leadsByStatus = rawLeads.reduce(
      (acc: Record<string, number>, curr) => ({ ...acc, [curr.status]: curr._count }),
      {}
    );

    const openDeals = rawLeads
      .filter((l) => l.status === 'APPOINTMENT_BOOKED' || l.status === 'FOLLOW_UP')
      .reduce((sum, l) => sum + l._count, 0);

    const wonDeals = leadsByStatus['CLOSED_WON'] || 0;

    return {
      leadsByStatus,
      opportunitiesByStage: {
        NEGOTIATION: openDeals,
        CLOSED_WON: wonDeals,
      },
    };
  }

  static async getAgentPerformance(organizationId: string) {
    const agents = await prisma.organizationMembership.findMany({
      where: { organizationId, role: { in: ['ADMIN', 'USER', 'AGENT'] } },
      include: { user: true },
    });

    const agentIds = agents.map((a) => a.id);

    const leadGroups = await prisma.lead.groupBy({
      by: ['assignedUserId', 'status'],
      where: { organizationId, deletedAt: null, assignedUserId: { in: agentIds } },
      _count: true,
    });

    return agents.map((agent) => {
      const agentLeads = leadGroups.filter((l) => l.assignedUserId === agent.id);
      const assignedCount = agentLeads.reduce((sum, l) => sum + l._count, 0);
      const wonDeals = agentLeads.find((l) => l.status === 'CLOSED_WON')?._count || 0;
      const openDeals = agentLeads
        .filter((l) => l.status !== 'CLOSED_WON' && l.status !== 'CLOSED_LOST')
        .reduce((sum, l) => sum + l._count, 0);

      return {
        agentId: agent.id,
        name: agent.user?.name || 'Unknown',
        email: agent.user?.email,
        assignedLeads: assignedCount,
        openOpportunities: openDeals,
        wonDeals,
      };
    });
  }

  static async getJourneyAnalytics(organizationId: string) {
    const journeys = await prisma.journey.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return journeys.map((j) => ({
      id: j.id,
      name: j.name,
      status: j.status,
      enrollments: j._count.enrollments,
    }));
  }
}

