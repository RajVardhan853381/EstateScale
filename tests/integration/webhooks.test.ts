import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { POST } from '@/app/api/webhooks/twilio/status/route';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

// Mock environment variables specifically for this test run
vi.stubEnv('NODE_ENV', 'production');
vi.stubEnv('TWILIO_AUTH_TOKEN', 'mock-secret-token');

describe('Twilio Webhooks - Status Updates', () => {
  let org: any;
  let message: any;

  beforeAll(async () => {
    await prisma.organization.deleteMany();
    org = await prisma.organization.create({
      data: { name: 'Webhook Org', slug: 'webhook-org' },
    });

    const contact = await prisma.contact.create({
      data: { organizationId: org.id, phone: '+1234567890' },
    });

    const conversation = await prisma.conversation.create({
      data: { organizationId: org.id, contactId: contact.id },
    });

    message = await prisma.message.create({
      data: {
        organizationId: org.id,
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        status: 'QUEUED',
        body: 'Test',
        from: '+19999999999',
        to: '+1234567890',
        externalId: 'SM1234567890',
      },
    });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany();
  });

  it('rejects request if x-twilio-signature is missing entirely', async () => {
    const req = new Request('https://example.com/api/webhooks/twilio/status?org=' + org.id, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        MessageSid: 'SM1234567890',
        MessageStatus: 'delivered',
      }).toString(),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Invalid signature');

    // Verify no mutation happened to DB
    const dbMessage = await prisma.message.findUnique({ where: { id: message.id } });
    expect(dbMessage?.status).toBe('QUEUED');
  });

  it('rejects request if x-twilio-signature is invalid/forged', async () => {
    const req = new Request('https://example.com/api/webhooks/twilio/status?org=' + org.id, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-twilio-signature': 'forged-base64-signature=',
      },
      body: new URLSearchParams({
        MessageSid: 'SM1234567890',
        MessageStatus: 'delivered',
      }).toString(),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('accepts request and updates status if x-twilio-signature is valid', async () => {
    const url = 'https://example.com/api/webhooks/twilio/status?org=' + org.id;
    const payload = { MessageSid: 'SM1234567890', MessageStatus: 'delivered' };

    // Generate a true valid Twilio signature mathematically using the mocked secret token
    // Twilio requires exact URL and sorted form data object matching for signature calculation
    const validSignature = twilio.getExpectedTwilioSignature('mock-secret-token', url, payload);

    const req = new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-twilio-signature': validSignature,
      },
      body: new URLSearchParams(payload).toString(),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify mutation succeeded
    const dbMessage = await prisma.message.findUnique({ where: { id: message.id } });
    expect(dbMessage?.status).toBe('DELIVERED');
  });
});
