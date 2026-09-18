import { getCurrentUser } from "./authorization";
import { prisma } from "@/lib/prisma";

export async function requirePlatformAdmin() {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    throw new Error("Unauthorized: Authentication required");
  }

  const platformAdmin = await prisma.platformAdmin.findUnique({
    where: { userId: user.id }
  });

  if (!platformAdmin) {
    throw new Error("Forbidden: Platform administrator access required");
  }

  return { user, platformAdmin };
}
