import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  signWebhookPayload,
  dispatchOutboundWebhook,
} from '../../src/lib/services/webhooks';
import type { WebhookSubscription } from '@prisma/client';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    webhookSubscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';

describe('Outbound Webhook Dispatcher & HMAC Signing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should compute valid HMAC-SHA256 signature', () => {
    const payload = JSON.stringify({ event: 'lead.created', id: '123' });
    const secret = 'whsec_test_secret_key_12345';

    const sig1 = signWebhookPayload(payload, secret);
    const sig2 = signWebhookPayload(payload, secret);

    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64); // 256 bits = 64 hex characters
  });

  it('should dispatch webhooks to matching subscribers with headers', async () => {
    const mockSubscriptions = [
      {
        id: 'sub-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretKey: 'whsec_secret_1',
        events: ['lead.created', 'lead.status_changed'],
        isActive: true,
        failureCount: 0,
      },
    ];

    vi.mocked(prisma.webhookSubscription.findMany).mockResolvedValue(
      mockSubscriptions as unknown as WebhookSubscription[]
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await dispatchOutboundWebhook('org-1', 'lead.created', {
      leadId: 'lead-99',
      score: 85,
    });

    expect(result.dispatched).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('https://example.com/webhook');
    expect(calledOptions.headers['X-EstateScale-Event']).toBe('lead.created');
    expect(calledOptions.headers['X-EstateScale-Signature-256']).toBeDefined();
    expect(calledOptions.headers['Content-Type']).toBe('application/json');

    vi.unstubAllGlobals();
  });

  it('should increment failure count and deactivate after 10 failures', async () => {
    const mockSubscriptions = [
      {
        id: 'sub-2',
        organizationId: 'org-1',
        url: 'https://failing-endpoint.com/webhook',
        secretKey: 'whsec_secret_2',
        events: ['*'], // Wildcard
        isActive: true,
        failureCount: 9, // One more failure triggers deactivation
      },
    ];

    vi.mocked(prisma.webhookSubscription.findMany).mockResolvedValue(
      mockSubscriptions as unknown as WebhookSubscription[]
    );
    vi.mocked(prisma.webhookSubscription.update).mockResolvedValue({} as unknown as WebhookSubscription);

    const mockFetch = vi.fn().mockRejectedValue(new Error('Connection timeout'));
    vi.stubGlobal('fetch', mockFetch);

    await dispatchOutboundWebhook('org-1', 'appointment.booked', {
      leadId: 'lead-55',
    });

    expect(prisma.webhookSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-2' },
      data: {
        failureCount: 10,
        isActive: false, // Deactivated!
      },
    });

    vi.unstubAllGlobals();
  });
});
