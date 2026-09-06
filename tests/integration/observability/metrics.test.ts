import { describe, it, expect, vi, beforeEach } from 'vitest';
import { metrics } from '../../../src/lib/logger/metrics';
import { logger } from '../../../src/lib/logger';
import { dispatchOutboxEvents } from '../../../src/lib/queue/outbox-dispatcher';
import { prisma } from '../../../src/lib/prisma';
import { executeSendSms } from '../../../src/lib/services/communication';

vi.mock('../../../src/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn()
    }
}));

describe('Phase 6C: Step 3 Metrics Abstraction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('emits debug logs for metric increments securely without leaking payloads', () => {
        metrics.increment('test.metric', 1, { safeTag: 'yes' });
        expect(logger.debug).toHaveBeenCalledWith(
            { metric: 'test.metric', value: 1, type: 'counter', tags: { safeTag: 'yes' } },
            '[Metric] increment test.metric'
        );
    });

    it('emits timing debug logs securely', () => {
        metrics.timing('test.timing', 100, { safeTag: 'no' });
        expect(logger.debug).toHaveBeenCalledWith(
            { metric: 'test.timing', value: 100, type: 'timing', tags: { safeTag: 'no' } },
            '[Metric] timing test.timing'
        );
    });
});
