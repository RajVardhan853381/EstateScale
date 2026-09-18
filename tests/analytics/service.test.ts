import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsService } from "../../src/lib/analytics/service";
import { prisma } from "../../src/lib/prisma";

type MockFn = { mockResolvedValue: (val: unknown) => void };

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    lead: {
      count: vi.fn(),
      groupBy: vi.fn()
    },
    opportunity: {
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn()
    },
    leadIntelligence: {
      count: vi.fn()
    },
    organizationMembership: {
      findMany: vi.fn()
    },
    journey: {
      findMany: vi.fn()
    }
  }
}));

describe("Analytics Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should safely evaluate null relationships and bounded aggregations", async () => {
        (prisma.lead.count as unknown as MockFn).mockResolvedValue(10);

        // Simulating the dynamic Prisma dynamic type boundary execution fallback
        (prisma as unknown as Record<string, unknown>).leadIntelligence = { count: vi.fn().mockResolvedValue(5) };
        (prisma as unknown as Record<string, unknown>).opportunity = {
           count: vi.fn().mockResolvedValue(3),
           aggregate: vi.fn().mockResolvedValue({ _sum: { estimatedValue: 500000 }})
        };

        const result = await AnalyticsService.getDashboardMetrics("org-1");
        expect(result.leads.total).toBe(10);
        expect(result.leads.hot).toBe(5);
        expect(result.pipeline.value).toBe(500000);
    });

    it("should process safe empty states without failing on missing relationships natively", async () => {
        (prisma.lead.count as unknown as MockFn).mockResolvedValue(0);
        (prisma as unknown as Record<string, unknown>).leadIntelligence = undefined;
        (prisma as unknown as Record<string, unknown>).opportunity = undefined;

        const result = await AnalyticsService.getDashboardMetrics("org-1");
        expect(result.leads.total).toBe(0);
        expect(result.leads.hot).toBe(0);
        expect(result.pipeline.value).toBe(0);
    });
});
