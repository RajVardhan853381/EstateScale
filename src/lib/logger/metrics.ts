import { logger } from './index';

/**
 * Lightweight metrics abstraction serving as a foundational interface
 * for OpenTelemetry, Datadog, Prometheus, etc., without prematurely
 * committing to a specific heavyweight backend.
 */
export const metrics = {
  /**
   * Increments a monotonic counter.
   * @param name - The metric name (e.g. queue.jobs.completed)
   * @param value - The increment step (default 1)
   * @param tags - Safe dimensional metadata (tenantId, provider, code, etc.)
   */
  increment: (name: string, value: number = 1, tags?: Record<string, string | number | undefined>) => {
    logger.debug({ metric: name, value, type: 'counter', tags }, `[Metric] increment ${name}`);
  },

  /**
   * Records a timing observation.
   * @param name - The metric name (e.g. queue.job.duration_ms)
   * @param durationMs - The execution time in ms
   * @param tags - Safe dimensional metadata
   */
  timing: (name: string, durationMs: number, tags?: Record<string, string | number | undefined>) => {
    logger.debug({ metric: name, value: durationMs, type: 'timing', tags }, `[Metric] timing ${name}`);
  },

  /**
   * Records an absolute value.
   */
  gauge: (name: string, value: number, tags?: Record<string, string | number | undefined>) => {
    logger.debug({ metric: name, value, type: 'gauge', tags }, `[Metric] gauge ${name}`);
  }
};
