import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { requireOrganizationMember } from '@/lib/auth/authorization';

export async function POST(req: Request) {
  try {
    const { slug, email, role } = await req.json();

    if (!slug || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { organization, membership } = await requireOrganizationMember(slug);

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.organizationInvitation.upsert({
      where: {
        organizationId_email: {
          organizationId: organization.id,
          email: normalizedEmail,
        },
      },
      update: {
        token,
        role,
        status: 'PENDING',
        expiresAt,
      },
      create: {
        organizationId: organization.id,
        email: normalizedEmail,
        role,
        token,
        status: 'PENDING',
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation created',
      token,
      inviteUrl: `/invite/${token}`,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
