import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { metricsData, incrementMetric, getMetricsSnapshot } from '@/lib/metrics';
import { getRequestId } from '@/lib/correlation';

describe('Observability - Phase 6C', () => {
  describe('Metrics', () => {
    beforeEach(() => {
      // Reset metrics before each test
      for (const key of Object.keys(metricsData)) {
        (metricsData as any)[key] = 0;
      }
    });

    it('increments specific metrics cleanly', () => {
      incrementMetric('apiRequests');
      incrementMetric('apiRequests', 4);
      incrementMetric('smsFailures');

      const snapshot = getMetricsSnapshot();
      expect(snapshot.apiRequests).toBe(5);
      expect(snapshot.smsFailures).toBe(1);
      expect(snapshot.aiRequests).toBe(0);
    });
  });

  describe('Correlation IDs', () => {
    it('generates a new uuid if no header is present', async () => {
      vi.mock('next/headers', () => ({
        headers: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(null)
        })
      }));

      const reqId = await getRequestId();
      expect(reqId).toBeDefined();
      expect(reqId.length).toBeGreaterThan(10);
      vi.unmock('next/headers');
    });
  });
});
