import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { dispatchOutboxEvents, recoverStaleEvents } from '@/lib/queue/outbox-dispatcher';
import * as producer from '@/lib/queue/producer';

// Mock BullMQ completely to prevent true Redis enqueue execution
vi.mock('@/lib/queue/producer', () => ({
  enqueueAutomationJob: vi.fn().mockResolvedValue(true),
}));

describe('Transactional Outbox Dispatcher', () => {
  let org: any;

  beforeAll(async () => {
    await prisma.organization.deleteMany();
    org = await prisma.organization.create({
      data: { name: 'Outbox Org', slug: 'outbox-org' },
    });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany();
  });

  it('claims PENDING events safely and transitions them to DISPATCHED on successful enqueue', async () => {
    const event = await prisma.outboxEvent.create({
      data: {
        organizationId: org.id,
        actionType: 'MOCK_TEST',
        payload: { test: true },
        status: 'PENDING',
      },
    });

    const claimed = await dispatchOutboxEvents(10);
    expect(claimed).toBe(1);

    expect(producer.enqueueAutomationJob).toHaveBeenCalledWith({ test: true });

    const updated = await prisma.outboxEvent.findUnique({ where: { id: event.id } });
    expect(updated?.status).toBe('DISPATCHED');
    expect(updated?.attempts).toBe(1);
  });

  it('transitions events to FAILED and implements backoff on Redis enqueue failure', async () => {
    vi.mocked(producer.enqueueAutomationJob).mockRejectedValueOnce(new Error('Redis Outage'));

    const event = await prisma.outboxEvent.create({
      data: {
        organizationId: org.id,
        actionType: 'MOCK_TEST_FAIL',
        payload: { fail: true },
        status: 'PENDING',
      },
    });

    const claimed = await dispatchOutboxEvents(10);
    expect(claimed).toBe(1);

    const updated = await prisma.outboxEvent.findUnique({ where: { id: event.id } });
    expect(updated?.status).toBe('FAILED');
    expect(updated?.attempts).toBe(1);
    expect(updated?.lastError).toBe('Redis Outage');
    expect(updated?.availableAt.getTime()).toBeGreaterThan(Date.now()); // Should be scheduled into the future
  });

  it('does not claim future events', async () => {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 10);

    await prisma.outboxEvent.create({
      data: {
        organizationId: org.id,
        actionType: 'FUTURE_TEST',
        payload: { future: true },
        status: 'PENDING',
        availableAt: futureDate,
      },
    });

    const claimed = await dispatchOutboxEvents(10);
    expect(claimed).toBe(0);
  });

  it('recovers stale PROCESSING events correctly', async () => {
    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 10);

    const event = await prisma.outboxEvent.create({
      data: {
        organizationId: org.id,
        actionType: 'STALE_TEST',
        payload: { stale: true },
        status: 'PROCESSING',
        updatedAt: pastDate,
      },
    });

    await recoverStaleEvents();

    const updated = await prisma.outboxEvent.findUnique({ where: { id: event.id } });
    expect(updated?.status).toBe('PENDING');
  });
});
