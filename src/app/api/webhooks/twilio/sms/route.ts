import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { handleInboundSms } from '@/lib/services/communication';
import { runWithRequestContext } from '@/lib/observability/context';
import crypto from 'node:crypto';

export const maxDuration = 60;

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
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  return runWithRequestContext({ requestId }, async () => {
    try {
      const signature = req.headers.get('x-twilio-signature');
      const url = getWebhookUrl(req);

      // Parse form body
      const bodyText = await req.text();
      const params = new URLSearchParams(bodyText);
      const data = Object.fromEntries(params.entries());

      if (process.env.NODE_ENV !== 'test') {
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!authToken) throw new Error('Missing TWILIO_AUTH_TOKEN');

        const isValid =
          (signature && twilio.validateRequest(authToken, signature, url, data)) ||
          (signature && twilio.validateRequest(authToken, signature, req.url, data));

        if (!isValid) {
          return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }
      }

      const toPhone = data.To;
      const fromPhone = data.From;
      const body = data.Body;
      const externalId = data.MessageSid;

      try {
        await handleInboundSms(toPhone, fromPhone, body, externalId);
      } catch (error: unknown) {
        if ((error as Error).message === 'No organization config found') {
          return NextResponse.json({ error: (error as Error).message }, { status: 404 });
        }
        throw error;
      }

      // Return compliant TwiML
      const twiml = new twilio.twiml.MessagingResponse();
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    } catch (error) {
      console.error('[Twilio SMS Webhook Error]:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
