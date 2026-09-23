import { getCurrentUser } from './authorization';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export const requirePlatformAdmin = cache(async (redirectToLogin: boolean = false) => {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    if (redirectToLogin) {
      redirect('/login?callbackUrl=/admin/ops');
    }
    throw new Error('Unauthorized: Authentication required');
  }

  const platformAdmin = await prisma.platformAdmin.findUnique({
    where: { userId: user.id },
  });

  if (!platformAdmin) {
    if (redirectToLogin) {
      redirect('/login?error=AccessDenied');
    }
    throw new Error('Forbidden: Platform administrator access required');
  }

  return { user, platformAdmin };
});
