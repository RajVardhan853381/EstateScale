import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  organizationId?: string;
  userId?: string;
  startTime?: number;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Execute a callback within an ambient request correlation context.
 */
export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

/**
 * Get the current ambient request correlation context if available.
 */
export function getRequestContext(): Partial<RequestContext> {
  return storage.getStore() || {};
}

/**
 * Convenience helper to retrieve current active correlation trace ID.
 */
export function getTraceId(): string | undefined {
  return storage.getStore()?.requestId;
}
