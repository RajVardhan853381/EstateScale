import { headers } from 'next/headers';

export async function getRequestId(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    return headersList.get('x-correlation-id') || headersList.get('x-request-id') || undefined;
  } catch (e) {
    return undefined;
  }
}
