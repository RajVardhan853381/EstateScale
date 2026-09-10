import { prisma } from '../prisma';
import { CommunicationProvider } from '../communication/provider';
import { TwilioProvider, MockCommunicationProvider } from '../communication/twilio';
import { checkAndIncrementQuota, checkRateLimit } from '@/lib/rate-limit/redis';
import logger from '@/lib/logger';
import { incrementMetric } from '@/lib/metrics';

const getProvider = (): CommunicationProvider => {
  if (process.env.NODE_ENV === 'test' || !process.env.TWILIO_ACCOUNT_SID) {
    return new MockCommunicationProvider();
  }
  return new TwilioProvider();
};

export async function executeSendSms(
  organizationId: string,
  leadId: string,
  body: string,
  existingMessageId?: string
) {
  const log = logger.child({ module: 'communication-service', organizationId, leadId, existingMessageId });
  incrementMetric('smsRequests');

  const orgConfig = await prisma.organizationCommunicationConfig.findFirst({
    where: { organizationId, isActive: true },
  });

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: { contact: true },
  });

  if (!orgConfig || !lead || !lead.contact?.phone) {
    log.error('Missing configuration or lead phone number.');
    incrementMetric('smsFailures');
    throw new Error('Missing configuration or lead phone number.');
  }

  let conversation = await prisma.conversation.findFirst({
    where: { organizationId, leadId },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        organizationId,
        leadId,
        contactId: lead.contactId || lead.id,
        channel: 'SMS',
      },
    });
  }

  if (conversation.status === 'OPT_OUT') {
    log.warn('Cannot send SMS. Lead has opted out.');
    incrementMetric('smsFailures');
    throw new Error('Cannot send SMS. Lead has opted out.');
  }

  let messageId = existingMessageId || '';

  if (process.env.NODE_ENV !== 'test') {
    await checkRateLimit(`sms:tenant:${organizationId}`, { limit: 15, windowSec: 60 });
    await checkAndIncrementQuota(organizationId, 'sms_send');
  }

  if (!messageId) {
    const message = await prisma.message.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        status: 'SENDING',
        body,
        from: orgConfig.phoneNumber,
        to: lead.contact.phone,
      },
    });
    messageId = message.id;
  } else {
    await prisma.message.update({
      where: { id: messageId, organizationId },
      data: { status: 'SENDING', from: orgConfig.phoneNumber },
    });
  }

  const provider = getProvider();
  const result = await provider.sendSms(
    lead.contact.phone,
    orgConfig.phoneNumber,
    body,
    organizationId
  );

  if (result.success) {
    await prisma.message.update({
      where: { id: messageId, organizationId },
      data: { status: 'SENT', externalId: result.externalId },
    });
    log.info({ messageId, externalId: result.externalId }, 'SMS successfully sent');
  } else {
    await prisma.message.update({
      where: { id: messageId, organizationId },
      data: { status: 'FAILED', error: result.error },
    });

    incrementMetric('smsFailures');
    log.error({ messageId, err: result.error }, 'SMS sending failed');

    if (result.error === 'OPT_OUT') {
      await prisma.conversation.update({
        where: { id: conversation.id, organizationId },
        data: { status: 'OPT_OUT' },
      });
      log.warn({ conversationId: conversation.id }, 'Lead updated to OPT_OUT following failed send');
    }
    throw new Error(`SMS Provider Error: ${result.error}`);
  }
}
