'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/authorization';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

export async function registerAndAcceptInviteAction(
  token: string,
  payload: {
    name: string;
    password: string;
    confirmPassword: string;
  }
) {
  if (!token) return { success: false, error: 'Invalid invitation token.' };

  const { name, password, confirmPassword } = payload;

  if (!name || name.trim().length < 2) {
    return { success: false, error: 'Full name must be at least 2 characters.' };
  }

  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasDigit) {
    return {
      success: false,
      error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
    };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }

  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
    return { success: false, error: 'This invitation has expired or is invalid.' };
  }

  // Check if a user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  });

  if (existingUser) {
    return {
      success: false,
      error: 'An account with this email already exists. Please log in to accept the invitation.',
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create the new User
      const newUser = await tx.user.create({
        data: {
          email: invitation.email,
          name: name.trim(),
          passwordHash,
        },
      });

      // 2. Link User to the Organization with the invited role
      await tx.organizationMembership.create({
        data: {
          userId: newUser.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      // 3. Mark Invitation as ACCEPTED
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });
    });

    return {
      success: true,
      email: invitation.email,
      orgSlug: invitation.organization.slug,
    };
  } catch (error: unknown) {
    console.error('Failed to register and accept invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed.',
    };
  }
}

export async function acceptInviteForLoggedInUser(token: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.id) {
    redirect(`/login?callbackUrl=/invite/${token}`);
  }

  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
    throw new Error('Invalid or expired invitation');
  }

  if (
    !currentUser.email ||
    currentUser.email.toLowerCase() !== invitation.email.toLowerCase()
  ) {
    throw new Error(
      `This invitation was sent to ${invitation.email}, but you are signed in as ${currentUser.email}. Please switch accounts to accept.`
    );
  }

  await prisma.$transaction(async (tx) => {
    // Check if membership already exists
    const existingMembership = await tx.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: currentUser.id!,
          organizationId: invitation.organizationId,
        },
      },
    });

    if (!existingMembership) {
      await tx.organizationMembership.create({
        data: {
          userId: currentUser.id!,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });
    }

    await tx.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });
  });

  redirect(`/org/${invitation.organization.slug}/dashboard`);
}
