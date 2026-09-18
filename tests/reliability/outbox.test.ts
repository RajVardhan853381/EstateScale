import { describe, it, expect, vi } from 'vitest';
import { recoverStaleOutboxEvents } from '../../src/lib/queue/outbox-processor';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    outboxEvent: {
      updateMany: vi.fn(),
    },
  },
}));

type MockPrisma = {
  outboxEvent: { updateMany: (args: unknown) => void };
};

describe('Outbox Stale Recovery', () => {
  it('should recover processing jobs older than 5 minutes safely', async () => {
    const mockPrisma = prisma as unknown as MockPrisma;
    mockPrisma.outboxEvent.updateMany = vi.fn().mockResolvedValue({ count: 5 });

    await expect(recoverStaleOutboxEvents()).resolves.toBeUndefined();
    expect(mockPrisma.outboxEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PROCESSING',
          lastAttemptAt: expect.anything(),
        }),
        data: { status: 'PENDING' },
      })
    );
  });
});
