/**
 * Asynchronous Background Task Runner
 * 
 * In Next.js serverless runtimes (Server Actions & Route Handlers), this uses `after()`
 * from `next/server` to decouple long-running operations (such as multi-second Gemini AI
 * calls) from the synchronous HTTP request/response lifecycle. This guarantees that CRM
 * mutations and inbound webhooks return in <100ms while serverless execution completes reliably.
 * 
 * In CLI workers, tests, or non-request contexts, it falls back to an isolated promise handler.
 */
export function runBackgroundTask(task: () => Promise<void>): void {
  try {
    // Dynamically resolve next/server to avoid importing during client builds or edge contexts
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nextServer = require('next/server');
    if (typeof nextServer?.after === 'function') {
      nextServer.after(task);
      return;
    }
  } catch {
    // Fall back when outside active Next.js request lifecycle
  }

  void task().catch((err: unknown) => {
    console.error('[BackgroundTask] Asynchronous background task failure:', err);
  });
}
