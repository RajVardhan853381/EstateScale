import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  runWithRequestContext,
  getRequestContext,
  getTraceId,
} from '../../src/lib/observability/context';
import { logger, auditLogger } from '../../src/lib/observability/logger';

describe('Observability & Distributed Tracing Context', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should maintain ambient request context via AsyncLocalStorage', () => {
    const ctx = {
      requestId: 'req-test-trace-id-123',
      organizationId: 'org-test-1',
      userId: 'user-broker-7',
    };

    runWithRequestContext(ctx, () => {
      expect(getRequestContext().requestId).toBe('req-test-trace-id-123');
      expect(getRequestContext().organizationId).toBe('org-test-1');
      expect(getTraceId()).toBe('req-test-trace-id-123');
    });

    // Outside the block, context should be empty
    expect(getTraceId()).toBeUndefined();
  });

  it('should automatically include traceId in structured logger output', () => {
    const ctx = {
      requestId: 'req-correlation-999',
      organizationId: 'org-luxury-realty',
      userId: 'usr-agent-4',
    };

    runWithRequestContext(ctx, () => {
      logger.info({ leadId: 'lead-42' }, 'Lead processed successfully');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0] as string);

      expect(loggedJson.level).toBe('info');
      expect(loggedJson.traceId).toBe('req-correlation-999');
      expect(loggedJson.organizationId).toBe('org-luxury-realty');
      expect(loggedJson.userId).toBe('usr-agent-4');
      expect(loggedJson.leadId).toBe('lead-42');
      expect(loggedJson.msg).toBe('Lead processed successfully');
      expect(loggedJson.timestamp).toBeDefined();
    });
  });

  it('should automatically format audit event logs with type audit_event', () => {
    runWithRequestContext({ requestId: 'req-audit-1' }, () => {
      auditLogger.info({ action: 'LEAD_EXPORTED' }, 'Leads exported to CSV');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0] as string);

      expect(loggedJson.type).toBe('audit_event');
      expect(loggedJson.traceId).toBe('req-audit-1');
      expect(loggedJson.action).toBe('LEAD_EXPORTED');
    });
  });
});
