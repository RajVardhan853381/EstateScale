import { prisma } from '@/lib/prisma';
import { AITaskType } from './router';
import { estimateTaskCost } from './cost';

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Returns the UTC timestamp corresponding to the start of the current calendar month.
 */
export function getUtcCurrentMonthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Atomically rolls over an organization's monthly AI spend if the billing cycle has advanced
 * to a new calendar month. Race-safe across concurrent serverless invocations.
 */
export async function rolloverOrgAiQuotaIfNeeded(
  organizationId: string,
  now: Date = new Date()
): Promise<boolean> {
  const currentMonthStart = getUtcCurrentMonthStart(now);

  const result = await prisma.organization.updateMany({
    where: {
      id: organizationId,
      aiSpendResetAt: { lt: currentMonthStart },
    },
    data: {
      currentMonthAiSpend: 0.0,
      aiQuotaExceeded: false,
      aiSpendResetAt: now,
    },
  });

  return result.count > 0;
}

/**
 * Sweeps all organizations and resets monthly AI quotas for any whose last reset was prior to
 * the start of the current calendar month. Suitable for scheduled cron execution.
 */
export async function resetMonthlyAiQuotas(now: Date = new Date()): Promise<number> {
  const currentMonthStart = getUtcCurrentMonthStart(now);

  const result = await prisma.organization.updateMany({
    where: {
      aiSpendResetAt: { lt: currentMonthStart },
    },
    data: {
      currentMonthAiSpend: 0.0,
      aiQuotaExceeded: false,
      aiSpendResetAt: now,
    },
  });

  return result.count;
}

/**
 * Validates that an organization has sufficient AI budget remaining before triggering LLM calls.
 * Automatically performs an atomic monthly rollover if the tenant has crossed into a new calendar month.
 * Dynamically computes estimated cost based on the task type or explicit cost figure.
 * Throws QuotaExceededError if limit is breached.
 */
export async function assertAiQuotaAvailable(
  organizationId: string,
  costOrTask: number | AITaskType = 0.01,
  now: Date = new Date()
): Promise<{ monthlyAiBudgetUsd: number; currentMonthAiSpend: number }> {
  // 1. Check and perform atomic monthly billing rollover if new month has started
  await rolloverOrgAiQuotaIfNeeded(organizationId, now);

  const estimatedCost =
    typeof costOrTask === 'number'
      ? costOrTask
      : estimateTaskCost(costOrTask);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      monthlyAiBudgetUsd: true,
      currentMonthAiSpend: true,
      aiQuotaExceeded: true,
    },
  });

  if (!org) {
    throw new Error('VALIDATION_ERROR: Organization not found');
  }

  if (org.aiQuotaExceeded || org.currentMonthAiSpend + estimatedCost > org.monthlyAiBudgetUsd) {
    // If not already marked, flag it
    if (!org.aiQuotaExceeded) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { aiQuotaExceeded: true },
      });
    }

    throw new QuotaExceededError(
      `Organization AI quota exceeded. Monthly spend ($${org.currentMonthAiSpend.toFixed(
        2
      )}) has reached the configured budget limit ($${org.monthlyAiBudgetUsd.toFixed(2)}).`
    );
  }

  return {
    monthlyAiBudgetUsd: org.monthlyAiBudgetUsd,
    currentMonthAiSpend: org.currentMonthAiSpend,
  };
}
