import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOrganizationMember } from '@/lib/auth/authorization';

export async function POST(req: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    const slug = params.slug;

    const { organization, membership } = await requireOrganizationMember(slug);

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { step, config, advanceTo } = body;

    // Save configurations based on step
    let updatedSettings = (organization.settings as Record<string, unknown>) || {};

    // Convert to Prisma compliant json
    if (typeof updatedSettings !== 'object' || updatedSettings === null) {
      updatedSettings = {};
    }

    if (step === 'AI') {
      updatedSettings = { ...updatedSettings, ai: config };
    } else if (step === 'COMMUNICATION') {
      updatedSettings = { ...updatedSettings, communication: config };
    } else if (step === 'COMPANY') {
      updatedSettings = { ...updatedSettings, company: config };
    }

    await prisma.$transaction(async (tx) => {
      // Update organization settings
      // Workaround for Prisma json strong typing
      const settingsPayload = JSON.parse(JSON.stringify(updatedSettings));
      await tx.organization.update({
        where: { id: organization.id },
        data: { settings: settingsPayload },
      });

      if (step === 'COMMUNICATION') {
        const commConfig = config as Record<string, unknown> | undefined;
        const inputNumber = (commConfig?.phoneNumber as string)?.trim();
        const phoneNumber =
          inputNumber || process.env.TWILIO_PHONE_NUMBER || '+15550000000';
        const isSmsActive = commConfig?.enabled !== false;

        if (inputNumber && isSmsActive) {
          const conflicting = await tx.organizationCommunicationConfig.findFirst({
            where: {
              phoneNumber: inputNumber,
              isActive: true,
              organizationId: { not: organization.id },
            },
            include: { organization: true },
          });

          if (conflicting) {
            throw new Error(
              `Phone number ${inputNumber} is already assigned to organization "${conflicting.organization.name}". Please provide a unique phone number.`
            );
          }
        }

        const existing = await tx.organizationCommunicationConfig.findFirst({
          where: { organizationId: organization.id },
        });

        if (existing) {
          await tx.organizationCommunicationConfig.update({
            where: { id: existing.id },
            data: { phoneNumber, isActive: isSmsActive },
          });
        } else {
          await tx.organizationCommunicationConfig.create({
            data: {
              organizationId: organization.id,
              phoneNumber,
              isActive: isSmsActive,
              provider: 'TWILIO',
            },
          });
        }
      }

      // Update setup state progress
      const setupState = await tx.organizationSetupState.findUnique({
        where: { organizationId: organization.id },
      });

      if (setupState) {
        const completedSteps = Array.isArray(setupState.completedSteps)
          ? [...(setupState.completedSteps as string[])]
          : [];
        if (!completedSteps.includes(step)) {
          completedSteps.push(step);
        }
        await tx.organizationSetupState.update({
          where: { organizationId: organization.id },
          data: {
            completedSteps,
            currentStep: advanceTo || step,
          },
        });
      }
    });

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
