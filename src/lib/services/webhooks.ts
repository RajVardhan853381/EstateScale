import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/observability/logger';
import crypto from 'node:crypto';

export interface WebhookEnvelope<T = Record<string, unknown>> {
  id: string;
  event: string;
  timestamp: string;
  organizationId: string;
  data: T;
}

/**
 * Computes an HMAC-SHA256 signature for webhook payload verification.
 */
export function signWebhookPayload(payloadString: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(payloadString).digest('hex');
}

/**
 * Dispatches an outbound webhook event to all subscribed external endpoints for an organization.
 */
export async function dispatchOutboundWebhook<T extends Record<string, unknown>>(
  organizationId: string,
  event: string,
  data: T
): Promise<{ dispatched: number }> {
  try {
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // Filter subscriptions matching the event or wildcard '*'
    const matching = subscriptions.filter(
      (sub) => sub.events.includes('*') || sub.events.includes(event)
    );

    if (matching.length === 0) {
      return { dispatched: 0 };
    }

    const envelope: WebhookEnvelope<T> = {
      id: `evt_${crypto.randomUUID()}`,
      event,
      timestamp: new Date().toISOString(),
      organizationId,
      data,
    };

    const payloadString = JSON.stringify(envelope);

    // Queue or deliver to each endpoint
    const deliveryPromises = matching.map(async (sub) => {
      const signature = signWebhookPayload(payloadString, sub.secretKey);
      try {
        const response = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-EstateScale-Event': event,
            'X-EstateScale-Delivery': envelope.id,
            'X-EstateScale-Signature-256': signature,
            'User-Agent': 'EstateScale-Webhook-Dispatcher/1.0',
          },
          body: payloadString,
          signal: AbortSignal.timeout(5000), // 5s timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }

        // Reset failure count on success if previously failed
        if (sub.failureCount > 0) {
          await prisma.webhookSubscription.update({
            where: { id: sub.id },
            data: { failureCount: 0 },
          });
        }
      } catch (err: unknown) {
        logger.warn(
          {
            subscriptionId: sub.id,
            url: sub.url,
            event,
            error: err instanceof Error ? err.message : String(err),
          },
          'Outbound webhook delivery failed'
        );

        const newFailureCount = sub.failureCount + 1;
        await prisma.webhookSubscription.update({
          where: { id: sub.id },
          data: {
            failureCount: newFailureCount,
            // Automatically deactivate after 10 consecutive delivery failures
            isActive: newFailureCount < 10,
          },
        });
      }
    });

    await Promise.allSettled(deliveryPromises);
    return { dispatched: matching.length };
  } catch (error: unknown) {
    logger.error(
      {
        organizationId,
        event,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed in dispatchOutboundWebhook'
    );
    return { dispatched: 0 };
  }
}
