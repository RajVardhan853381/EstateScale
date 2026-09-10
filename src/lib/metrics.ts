/**
 * Lightweight, simple in-memory metrics subsystem.
 * WARNING: These metrics reset on process restart and are process-local.
 * They are not meant as a durable monitoring replacement, but are sufficient
 * for this modular monolith scaling target (~20 orgs) for observability checks.
 */

type MetricCounters = {
  apiRequests: number;
  apiErrors: number;
  aiRequests: number;
  aiFailures: number;
  smsRequests: number;
  smsFailures: number;
  outboxEventsCreated: number;
  outboxEventsProcessed: number;
  outboxFailures: number;
  automationExecutions: number;
  automationFailures: number;
  workerJobsProcessed: number;
  workerJobFailures: number;
};

// Global object to maintain metrics across Next.js Hot Module Reloads during dev
const globalForMetrics = global as unknown as { metricsData: MetricCounters };

export const metricsData: MetricCounters = globalForMetrics.metricsData || {
  apiRequests: 0,
  apiErrors: 0,
  aiRequests: 0,
  aiFailures: 0,
  smsRequests: 0,
  smsFailures: 0,
  outboxEventsCreated: 0,
  outboxEventsProcessed: 0,
  outboxFailures: 0,
  automationExecutions: 0,
  automationFailures: 0,
  workerJobsProcessed: 0,
  workerJobFailures: 0,
};

if (process.env.NODE_ENV !== 'production') {
  globalForMetrics.metricsData = metricsData;
}

/**
 * Increment a specific counter metric by a given value (default 1).
 */
export function incrementMetric(key: keyof MetricCounters, value = 1) {
  if (typeof metricsData[key] === 'number') {
    metricsData[key] += value;
  }
}

/**
 * Gets a snapshot of the current in-memory metrics.
 */
export function getMetricsSnapshot() {
  return { ...metricsData };
}
