import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config.mjs';

describe('Security Headers', () => {
  it('should enforce strict Content-Security-Policy', async () => {
    // @ts-expect-error - NextConfig dynamic typing
    const headers = await nextConfig.headers();
    const globalHeaders = headers.find((h: Record<string, unknown>) => h.source === '/(.*)');

    expect(globalHeaders).toBeDefined();

    const csp = (globalHeaders?.headers as Record<string, string>[]).find(
      (h) => h.key === 'Content-Security-Policy'
    );
    expect(csp?.value).toContain("default-src 'self'");

    const frameOptions = (globalHeaders?.headers as Record<string, string>[]).find(
      (h) => h.key === 'X-Frame-Options'
    );
    expect(frameOptions?.value).toBe('DENY');
  });
});
