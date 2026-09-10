import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

/**
 * Safely extracts or generates a Request ID (Correlation ID) for incoming requests.
 */
export async function getRequestId(): Promise<string> {
  try {
    const headersList = await headers();
    const existing = headersList.get('x-request-id');

    // Validate existing ID isn't arbitrary oversized payload
    if (existing && typeof existing === 'string' && existing.length < 100) {
      return existing;
    }
  } catch (error) {
    // If not in a Next.js server context where headers() is valid, gracefully fallback
  }

  return uuidv4();
}
