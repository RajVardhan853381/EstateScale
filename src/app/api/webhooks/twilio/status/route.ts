import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';
import logger from '@/lib/logger';
import { incrementMetric } from '@/lib/metrics';
import { getRequestId } from '@/lib/correlation';

export async function POST(req: Request) {
  const reqId = await getRequestId();
  const log = logger.child({ reqId, module: 'twilio-status-webhook' });

  try {
    const signature = req.headers.get('x-twilio-signature');
    const url = req.url;

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const data = Object.fromEntries(params.entries());

    if (process.env.NODE_ENV !== 'test') {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!authToken) throw new Error('Missing TWILIO_AUTH_TOKEN');
      if (!signature || !twilio.validateRequest(authToken, signature, url, data)) {
        log.warn({ url }, 'Invalid Twilio webhook signature rejected');
        incrementMetric('apiErrors');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403, headers: { 'x-request-id': reqId } });
      }
    }

    const externalId = data.MessageSid;
    const status = data.MessageStatus;

    if (!externalId || !status) {
      log.warn({ data }, 'Missing required MessageSid or MessageStatus');
      incrementMetric('apiErrors');
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400, headers: { 'x-request-id': reqId } });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('org');

    if (!organizationId) {
      log.warn('Missing organization query param in Twilio callback url');
      incrementMetric('apiErrors');
      return NextResponse.json({ error: 'Missing organization query param' }, { status: 400, headers: { 'x-request-id': reqId } });
    }

    let mappedStatus: 'SENT' | 'DELIVERED' | 'FAILED' = 'SENT';
    if (status === 'delivered') mappedStatus = 'DELIVERED';
    if (status === 'failed' || status === 'undelivered') mappedStatus = 'FAILED';

    const message = await prisma.message.findFirst({
      where: { externalId, organizationId },
    });

    if (message) {
      await prisma.message.update({
        where: { id: message.id, organizationId },
        data: { status: mappedStatus },
      });
      log.info({ messageId: message.id, mappedStatus, organizationId }, 'Updated SMS status from webhook');
    } else {
      log.warn({ externalId, organizationId }, 'Received status callback for unknown message externalId');
    }

    incrementMetric('apiRequests');
    return NextResponse.json({ success: true }, { headers: { 'x-request-id': reqId } });
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : 'Unknown' }, 'Twilio Status Webhook Execution Error');
    incrementMetric('apiErrors');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: { 'x-request-id': reqId } });
  }
}
