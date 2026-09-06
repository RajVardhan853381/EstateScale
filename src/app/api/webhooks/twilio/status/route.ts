import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

export async function POST(req: Request) {
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
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const externalId = data.MessageSid;
    const status = data.MessageStatus;

    if (!externalId || !status) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // We passed ?org=slug query parameter safely resolving multi-tenant mapping back from webhook boundaries natively
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
