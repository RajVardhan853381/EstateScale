import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

function getWebhookUrl(req: Request): string {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');

  if (forwardedHost) {
    const proto = forwardedProto || (forwardedHost.includes('localhost') ? 'http' : 'https');
    const { pathname, search } = new URL(req.url);
    return `${proto}://${forwardedHost}${pathname}${search}`;
  }

  return req.url;
}

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const data = Object.fromEntries(params.entries());

    const externalId = data.MessageSid;
    const status = data.MessageStatus;

    if (!externalId || !status) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (process.env.NODE_ENV !== 'test') {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!authToken) {
        console.error('[Twilio Status Webhook]: Missing TWILIO_AUTH_TOKEN configuration');
        return NextResponse.json(
          { error: 'Twilio authentication not configured' },
          { status: 500 }
        );
      }

      const signature = req.headers.get('x-twilio-signature');
      const url = getWebhookUrl(req);

      const isValid =
        (signature && twilio.validateRequest(authToken, signature, url, data)) ||
        (signature && twilio.validateRequest(authToken, signature, req.url, data));

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    // Tenant mapping from query param
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('org');

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization query param' }, { status: 400 });
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
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Twilio Status Webhook Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
