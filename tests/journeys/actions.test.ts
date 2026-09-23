import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeJourneyStep, recoverStaleJourneyExecutions } from '@/lib/journeys/worker';
import { prisma } from '@/lib/prisma';
import * as eventBus from '@/lib/events/bus';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    journeyEnrollment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    journeyExecution: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    lead: {
      update: vi.fn(),
    },
    leadActivity: {
      create: vi.fn(),
    },
    organizationMembership: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/events/bus', () => ({
  publishDomainEvent: vi.fn(),
}));

describe('Journey Action Handlers & Stale Recovery', () => {
  const orgId = 'org-1';
  const enrollmentId = 'enr-1';
  const leadId = 'lead-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes UPDATE_LEAD_STATUS action, updates lead, creates activity, and publishes event', async () => {
    const stepId = 'step-update-status';
    (prisma.journeyEnrollment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: enrollmentId,
      status: 'RUNNING',
      journeyId: 'j-1',
      journey: {
        steps: {
          startStepId: stepId,
          steps: [
            {
              id: stepId,
              type: 'ACTION',
              actionType: 'UPDATE_LEAD_STATUS',
              actionConfig: { status: 'CONTACTED' },
            },
          ],
        },
      },
      lead: {
        id: leadId,
        status: 'NEW',
        contact: { phone: '+1234567890' },
      },
    });

    (prisma.journeyExecution.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.journeyExecution.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'exec-1' });
    (prisma.lead.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: leadId, status: 'CONTACTED' });
    (prisma.leadActivity.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'act-1' });
    (prisma.journeyExecution.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.journeyEnrollment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await executeJourneyStep(orgId, enrollmentId, stepId);

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: leadId, organizationId: orgId },
      data: { status: 'CONTACTED' },
    });

    expect(prisma.leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: orgId,
          leadId,
          type: 'STATUS_CHANGED',
        }),
      })
    );

    expect(eventBus.publishDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LEAD_UPDATED',
        organizationId: orgId,
        leadId,
        metadata: expect.objectContaining({
          status: 'CONTACTED',
          previousStatus: 'NEW',
        }),
      })
    );
  });

  it('executes ASSIGN_LEAD action with verified membership', async () => {
    const stepId = 'step-assign';
    const agentUserId = 'agent-user-1';

    (prisma.journeyEnrollment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: enrollmentId,
      status: 'RUNNING',
      journeyId: 'j-1',
      journey: {
        steps: {
          startStepId: stepId,
          steps: [
            {
              id: stepId,
              type: 'ACTION',
              actionType: 'ASSIGN_LEAD',
              actionConfig: { assignedUserId: agentUserId },
            },
          ],
        },
      },
      lead: {
        id: leadId,
        status: 'NEW',
        contact: { phone: '+1234567890' },
      },
    });

    (prisma.journeyExecution.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.journeyExecution.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'exec-2' });
    (prisma.organizationMembership.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: agentUserId,
      organizationId: orgId,
      user: { name: 'Agent Sarah', email: 'sarah@luxury.com' },
    });
    (prisma.lead.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: leadId, assignedUserId: agentUserId });
    (prisma.leadActivity.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'act-2' });
    (prisma.journeyExecution.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.journeyEnrollment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await executeJourneyStep(orgId, enrollmentId, stepId);

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: leadId, organizationId: orgId },
      data: { assignedUserId: agentUserId },
    });

    expect(prisma.leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'ASSIGNED',
          organizationId: orgId,
          leadId,
        }),
      })
    );
  });

  it('executes CREATE_TASK action and records task metadata', async () => {
    const stepId = 'step-task';
    (prisma.journeyEnrollment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: enrollmentId,
      status: 'RUNNING',
      journeyId: 'j-1',
      journey: {
        steps: {
          startStepId: stepId,
          steps: [
            {
              id: stepId,
              type: 'ACTION',
              actionType: 'CREATE_TASK',
              actionConfig: {
                title: 'Schedule property viewing for buyer',
                dueDate: '2026-10-01T15:00:00Z',
                priority: 'HIGH',
              },
            },
          ],
        },
      },
      lead: {
        id: leadId,
        status: 'NEW',
        assignedUserId: 'agent-1',
        contact: { phone: '+1234567890' },
      },
    });

    (prisma.journeyExecution.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.journeyExecution.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'exec-3' });
    (prisma.leadActivity.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'act-3' });
    (prisma.journeyExecution.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.journeyEnrollment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await executeJourneyStep(orgId, enrollmentId, stepId);

    expect(prisma.leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'FOLLOW_UP',
          description: 'Schedule property viewing for buyer',
          metadata: expect.objectContaining({
            isTask: true,
            title: 'Schedule property viewing for buyer',
            priority: 'HIGH',
          }),
        }),
      })
    );
  });

  it('executes NOTIFY_AGENT action and creates notification activity', async () => {
    const stepId = 'step-notify';
    (prisma.journeyEnrollment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: enrollmentId,
      status: 'RUNNING',
      journeyId: 'j-1',
      journey: {
        steps: {
          startStepId: stepId,
          steps: [
            {
              id: stepId,
              type: 'ACTION',
              actionType: 'NOTIFY_AGENT',
              actionConfig: { message: 'High-value lead requires immediate call' },
            },
          ],
        },
      },
      lead: {
        id: leadId,
        status: 'NEW',
        assignedUserId: 'agent-1',
        contact: { firstName: 'Robert', lastName: 'Taylor', phone: '+1234567890' },
      },
    });

    (prisma.journeyExecution.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.journeyExecution.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'exec-4' });
    (prisma.leadActivity.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'act-4' });
    (prisma.journeyExecution.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.journeyEnrollment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await executeJourneyStep(orgId, enrollmentId, stepId);

    expect(prisma.leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'SYSTEM',
          description: 'Agent notification: High-value lead requires immediate call',
        }),
      })
    );
  });

  it('recovers stale executions stuck in RUNNING state back to WAITING', async () => {
    (prisma.journeyExecution.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 4 });

    const recoveredCount = await recoverStaleJourneyExecutions(10 * 60 * 1000);

    expect(recoveredCount).toBe(4);
    expect(prisma.journeyExecution.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'RUNNING',
        startedAt: { lte: expect.any(Date) },
      },
      data: {
        status: 'WAITING',
        scheduledFor: expect.any(Date),
      },
    });
  });
});
