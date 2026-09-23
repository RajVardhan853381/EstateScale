import { redirect } from 'next/navigation';

export default async function SettingsRedirectPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  redirect(`/org/${slug}/settings/security`);
}
