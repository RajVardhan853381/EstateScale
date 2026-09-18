"use server";

import { OnboardingService } from "@/lib/services/onboarding";
import { revalidatePath } from "next/cache";

export async function createOrgAction(formData: FormData) {
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const adminEmail = formData.get("adminEmail") as string;

  if (!name || !slug) return;

  await OnboardingService.createOrganization({ name, slug, adminEmail });
  revalidatePath("/admin/onboarding");
}
