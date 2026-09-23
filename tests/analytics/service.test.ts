import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '../../src/lib/analytics/service';
import { prisma } from '../../src/lib/prisma';

type MockFn = {
  mockResolvedValue: (val: unknown) => MockFn;
  mockResolvedValueOnce: (val: unknown) => MockFn;
};

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    lead: {
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    organizationMembership: {
      findMany: vi.fn(),
    },
    journey: {
      findMany: vi.fn(),
    },
  },
}));

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should safely calculate dashboard metrics from real lead models', async () => {
    (prisma.lead.count as unknown as MockFn)
      .mockResolvedValueOnce(25) // totalLeads
      .mockResolvedValueOnce(6) // hotLeads
      .mockResolvedValueOnce(18) // openOpportunities
      .mockResolvedValueOnce(4); // wonOpportunities

    (prisma.lead.aggregate as unknown as MockFn).mockResolvedValue({
      _sum: { budget: 4500000 },
    });

    const result = await AnalyticsService.getDashboardMetrics('org-1');
    expect(result.leads.total).toBe(25);
    expect(result.leads.hot).toBe(6);
    expect(result.pipeline.openOpportunities).toBe(18);
    expect(result.pipeline.wonOpportunities).toBe(4);
    expect(result.pipeline.value).toBe(4500000);
  });

  it('should process safe empty states without failing', async () => {
    (prisma.lead.count as unknown as MockFn).mockResolvedValue(0);
    (prisma.lead.aggregate as unknown as MockFn).mockResolvedValue({
      _sum: { budget: null },
    });

    const result = await AnalyticsService.getDashboardMetrics('org-1');
    expect(result.leads.total).toBe(0);
    expect(result.leads.hot).toBe(0);
    expect(result.pipeline.openOpportunities).toBe(0);
    expect(result.pipeline.wonOpportunities).toBe(0);
    expect(result.pipeline.value).toBe(0);
  });

  it('should calculate lead funnel distributions correctly', async () => {
    (prisma.lead.groupBy as unknown as MockFn).mockResolvedValue([
      { status: 'NEW', _count: 10 },
      { status: 'QUALIFIED', _count: 5 },
      { status: 'APPOINTMENT_BOOKED', _count: 3 },
      { status: 'FOLLOW_UP', _count: 2 },
      { status: 'CLOSED_WON', _count: 4 },
    ]);

    const result = await AnalyticsService.getLeadFunnel('org-1');
    expect(result.leadsByStatus['NEW']).toBe(10);
    expect(result.leadsByStatus['QUALIFIED']).toBe(5);
    expect(result.opportunitiesByStage.NEGOTIATION).toBe(5); // 3 + 2
    expect(result.opportunitiesByStage.CLOSED_WON).toBe(4);
  });

  it('should calculate agent performance based on assigned leads', async () => {
    (prisma.organizationMembership.findMany as unknown as MockFn).mockResolvedValue([
      {
        id: 'agent-1',
        role: 'AGENT',
        user: { name: 'Sarah Connor', email: 'sarah@example.com' },
      },
    ]);

    (prisma.lead.groupBy as unknown as MockFn).mockResolvedValue([
      { assignedUserId: 'agent-1', status: 'NEW', _count: 3 },
      { assignedUserId: 'agent-1', status: 'QUALIFIED', _count: 2 },
      { assignedUserId: 'agent-1', status: 'CLOSED_WON', _count: 1 },
    ]);

    const result = await AnalyticsService.getAgentPerformance('org-1');
    expect(result).toHaveLength(1);
    expect(result[0].agentId).toBe('agent-1');
    expect(result[0].name).toBe('Sarah Connor');
    expect(result[0].assignedLeads).toBe(6);
    expect(result[0].openOpportunities).toBe(5);
    expect(result[0].wonDeals).toBe(1);
  });
});

