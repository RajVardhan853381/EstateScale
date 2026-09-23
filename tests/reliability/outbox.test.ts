import { describe, it, expect, vi } from 'vitest';
import { recoverStaleJourneyExecutions } from '../../src/lib/journeys/worker';
import { ImportService } from '../../src/lib/services/import';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    journeyExecution: {
      updateMany: vi.fn(),
    },
    importJob: {
      updateMany: vi.fn(),
    },
  },
}));

describe('Reliability: Stale Background Job Recovery', () => {
  it('should recover stale RUNNING journey executions back to WAITING', async () => {
    (prisma.journeyExecution.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });

    const recovered = await recoverStaleJourneyExecutions(10 * 60 * 1000);
    expect(recovered).toBe(3);
    expect(prisma.journeyExecution.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'RUNNING',
          startedAt: expect.anything(),
        }),
        data: expect.objectContaining({
          status: 'WAITING',
          scheduledFor: expect.any(Date),
        }),
      })
    );
  });

  it('should recover stale PROCESSING import jobs to FAILED', async () => {
    (prisma.importJob.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });

    const recovered = await ImportService.recoverStaleImportJobs(15 * 60 * 1000);
    expect(recovered).toBe(2);
    expect(prisma.importJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PROCESSING',
          createdAt: expect.anything(),
        }),
        data: {
          status: 'FAILED',
        },
      })
    );
  });
});
