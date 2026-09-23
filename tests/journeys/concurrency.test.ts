import { describe, it, expect, vi, beforeEach } from 'vitest';

const { updateManyMock, updateMock, mockExecution } = vi.hoisted(() => {
  const mockExecution = {
    id: 'exec-123',
    enrollmentId: 'enroll-1',
    stepId: 'step-wait',
    status: 'WAITING',
    scheduledFor: new Date(Date.now() - 10000),
    enrollment: {
      journey: {
        steps: {
          startStepId: 'step-wait',
          steps: [
            {
              id: 'step-wait',
              type: 'WAIT',
              delayMs: 60000,
              nextStepId: 'step-end',
            },
            {
              id: 'step-end',
              type: 'END',
            },
          ],
        },
      },
    },
  };

  const updateManyMock = vi.fn();
  const updateMock = vi.fn().mockResolvedValue({ id: 'exec-123', status: 'COMPLETED' });

  return { updateManyMock, updateMock, mockExecution };
});

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    journeyExecution: {
      findMany: vi.fn().mockResolvedValue([mockExecution]),
      updateMany: updateManyMock,
      update: updateMock,
    },
  },
}));

const { stepCompletedMock } = vi.hoisted(() => ({
  stepCompletedMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/journeys/engine', () => ({
  JourneyEngine: {
    stepCompleted: stepCompletedMock,
  },
}));

describe('Journey Worker Concurrency Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should only process executions that are successfully claimed with count === 1', async () => {
    let claimed = false;
    updateManyMock.mockImplementation(async (args?: { where?: { status?: string } }) => {
      // Stale recovery check (status: 'RUNNING') returns 0 recovered items
      if (args?.where?.status === 'RUNNING') {
        return { count: 0 };
      }
      // First worker successfully claims (status: 'WAITING'); subsequent attempts fail
      if (args?.where?.status === 'WAITING' && !claimed) {
        claimed = true;
        return { count: 1 };
      }
      return { count: 0 };
    });

    const { processScheduledJourneySteps } = await import('../../src/lib/journeys/worker');

    // Worker 1 runs
    const res1 = await processScheduledJourneySteps();
    expect(res1.processed).toBe(1);
    expect(stepCompletedMock).toHaveBeenCalledTimes(1);

    // Worker 2 runs concurrently on the same due execution
    const res2 = await processScheduledJourneySteps();
    expect(res2.processed).toBe(0);
    // stepCompleted should STILL only have been called once
    expect(stepCompletedMock).toHaveBeenCalledTimes(1);
  });
});
