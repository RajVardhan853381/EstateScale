import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  assertAiQuotaAvailable,
  rolloverOrgAiQuotaIfNeeded,
  resetMonthlyAiQuotas,
  QuotaExceededError,
  getUtcCurrentMonthStart,
} from '@/lib/ai/guard';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe('AI Quota Lifecycle & Monthly Rollover', () => {
  const mockOrgId = 'org-luxury-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes correct start of calendar month in UTC', () => {
    const midMonthDate = new Date(Date.UTC(2026, 8, 15, 12, 30, 0)); // September 15, 2026
    const monthStart = getUtcCurrentMonthStart(midMonthDate);
    expect(monthStart.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('atomically rolls over spend if aiSpendResetAt is in a prior month', async () => {
    const now = new Date(Date.UTC(2026, 9, 2, 10, 0, 0)); // October 2, 2026
    (prisma.organization.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    const rolledOver = await rolloverOrgAiQuotaIfNeeded(mockOrgId, now);

    expect(rolledOver).toBe(true);
    expect(prisma.organization.updateMany).toHaveBeenCalledWith({
      where: {
        id: mockOrgId,
        aiSpendResetAt: { lt: new Date(Date.UTC(2026, 9, 1, 0, 0, 0)) },
      },
      data: {
        currentMonthAiSpend: 0.0,
        aiQuotaExceeded: false,
        aiSpendResetAt: now,
      },
    });
  });

  it('does not reset spend if already in the current calendar month', async () => {
    const now = new Date(Date.UTC(2026, 8, 20, 10, 0, 0));
    (prisma.organization.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    const rolledOver = await rolloverOrgAiQuotaIfNeeded(mockOrgId, now);

    expect(rolledOver).toBe(false);
  });

  it('allows AI operation when within budget limit', async () => {
    (prisma.organization.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    (prisma.organization.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockOrgId,
      monthlyAiBudgetUsd: 50.0,
      currentMonthAiSpend: 15.25,
      aiQuotaExceeded: false,
    });

    const result = await assertAiQuotaAvailable(mockOrgId, 0.05);

    expect(result.monthlyAiBudgetUsd).toBe(50.0);
    expect(result.currentMonthAiSpend).toBe(15.25);
  });

  it('throws QuotaExceededError and flags aiQuotaExceeded when budget is breached', async () => {
    (prisma.organization.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    (prisma.organization.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockOrgId,
      monthlyAiBudgetUsd: 50.0,
      currentMonthAiSpend: 49.98,
      aiQuotaExceeded: false,
    });
    (prisma.organization.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await expect(assertAiQuotaAvailable(mockOrgId, 0.05)).rejects.toThrow(QuotaExceededError);

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: mockOrgId },
      data: { aiQuotaExceeded: true },
    });
  });

  it('performs sweep reset across all expired tenants', async () => {
    const now = new Date(Date.UTC(2026, 10, 1, 0, 5, 0)); // November 1, 2026
    (prisma.organization.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 18 });

    const sweepCount = await resetMonthlyAiQuotas(now);

    expect(sweepCount).toBe(18);
    expect(prisma.organization.updateMany).toHaveBeenCalledWith({
      where: {
        aiSpendResetAt: { lt: new Date(Date.UTC(2026, 10, 1, 0, 0, 0)) },
      },
      data: {
        currentMonthAiSpend: 0.0,
        aiQuotaExceeded: false,
        aiSpendResetAt: now,
      },
    });
  });
});
