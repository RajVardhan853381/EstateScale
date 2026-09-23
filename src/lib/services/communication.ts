import { prisma } from '../prisma';
import { CommunicationProvider } from '../communication/provider';
import { TwilioProvider, MockCommunicationProvider } from '../communication/twilio';
import { withRetry } from '../reliability/retry';
import { auditLogger } from '../observability/logger';
import { publishDomainEvent } from '../events/bus';
import crypto from 'crypto';

const getProvider = (): CommunicationProvider => {
    if (process.env.NODE_ENV === "test" || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
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
  const orgConfig = await prisma.organizationCommunicationConfig.findFirst({
    where: { organizationId, isActive: true },
  });

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: { contact: true },
  });

  if (!orgConfig || !lead || !lead.contact?.phone) {
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
        contactId: lead.contactId || lead.contact.id,
        channel: 'SMS',
      },
    });
  }

  if (conversation.status === 'OPT_OUT') {
    throw new Error('Cannot send SMS. Lead has opted out.');
  }

  let messageId = existingMessageId || '';

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

  // Core Workflow Integrity: Execute actual sending through the phase-19 retry wrapper.
  try {
    const result = await withRetry(
      async () => {
        return await provider.sendSms(
          lead.contact!.phone!,
          orgConfig.phoneNumber,
          body,
          organizationId
        );
      },
      3,
      2000
    );

    if (result.success) {
      await prisma.message.update({
        where: { id: messageId, organizationId },
        data: { status: 'SENT', externalId: result.externalId },
      });

      // Linkage: CRM activities update explicitly for downstream visibility
      await prisma.leadActivity.create({
        data: {
          organizationId,
          leadId,
          type: 'CONTACTED',
          description: `SMS Sent successfully.`,
        },
      });
    } else {
      await prisma.message.update({
        where: { id: messageId, organizationId },
        data: { status: 'FAILED', error: result.error },
      });

      if (result.error === 'OPT_OUT') {
        await prisma.conversation.update({
          where: { id: conversation.id, organizationId },
          data: { status: 'OPT_OUT' },
        });
      }
      throw new Error(`SMS Provider Error: ${result.error}`);
    }
  } catch (error) {
    auditLogger.error(
      { organizationId, leadId, error: (error as Error).message },
      'Execute SMS critical failure'
    );
    await prisma.message.update({
      where: { id: messageId, organizationId },
      data: { status: 'FAILED', error: (error as Error).message },
    });
    throw error;
  }
}

export async function handleInboundSms(
  toPhone: string,
  fromPhone: string,
  body: string,
  externalId?: string
) {
  // Resolve Tenant
  const config = await prisma.organizationCommunicationConfig.findFirst({
    where: { phoneNumber: toPhone, isActive: true },
    include: { organization: true },
  });

  if (!config) {
    throw new Error('No organization config found');
  }

  const organizationId = config.organizationId;

  // Resolve Contact natively safely inside boundary
  let contact = await prisma.contact.findFirst({
    where: { organizationId, phone: fromPhone },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: { organizationId, phone: fromPhone, firstName: 'Unknown' },
    });
  }

  // Check for Lead
  const lead = await prisma.lead.findFirst({
    where: { organizationId, contactId: contact.id },
  });

  // Resolve Conversation Thread
  let conversation = await prisma.conversation.findFirst({
    where: { organizationId, contactId: contact.id },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { organizationId, contactId: contact.id, leadId: lead?.id, channel: 'SMS' },
    });
  }

  // Idempotency: Deduplicate webhook retries using externalId (Twilio MessageSid)
  if (externalId) {
    const existingMessage = await prisma.message.findFirst({
      where: { organizationId, externalId },
    });
    if (existingMessage) {
      auditLogger.info(
        { organizationId, externalId, messageId: existingMessage.id },
        'Inbound SMS deduplicated; already processed'
      );
      return existingMessage;
    }
  }

  // Handle native TCPA Opt-out payloads without AI invocation
  const normalizedBody = body.trim().toLowerCase();
  const optOutKeywords = ['stop', 'unsubscribe', 'cancel', 'quit', 'end'];
  if (optOutKeywords.includes(normalizedBody)) {
    await prisma.conversation.update({
      where: { id: conversation.id, organizationId },
      data: { status: 'OPT_OUT' },
    });
  }

  // Create the received record with race-safe unique constraint handling
  let createdMessage;
  try {
    createdMessage = await prisma.message.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        direction: 'INBOUND',
        status: 'RECEIVED',
        provider: 'TWILIO',
        body,
        from: fromPhone,
        to: toPhone,
        externalId,
      },
    });
  } catch (err: unknown) {
    if (
      externalId &&
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      const existingMessage = await prisma.message.findFirst({
        where: { organizationId, externalId },
      });
      if (existingMessage) {
        auditLogger.info(
          { organizationId, externalId, messageId: existingMessage.id },
          'Inbound SMS deduplicated; already processed via unique constraint race'
        );
        return existingMessage;
      }
    }
    throw err;
  }

  // Create CRM Activity
  if (lead) {
    await prisma.leadActivity.create({
      data: {
        organizationId,
        leadId: lead.id,
        type: 'CONTACTED',
        description: `SMS Received: ${body}`,
      },
    });

    // Plumb through event bus for Phase 4 automation loops seamlessly
    await publishDomainEvent({
      eventId: crypto.randomUUID(),
      organizationId,
      leadId: lead.id,
      type: 'MESSAGE_RECEIVED',
    });
  }

  return createdMessage;
}
