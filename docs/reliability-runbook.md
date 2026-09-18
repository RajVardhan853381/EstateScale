# Operational Reliability Runbook

## Startup Sequence

1. Database (PostgreSQL) must be online.
2. Redis must be online.
3. Node Worker Process (`npm run start:worker`) begins processing BullMQ queues.
4. Next.js App Router starts.

## Queue & Outbox Recovery

- `OutboxProcessor`: The outbox process locks un-dispatched domain events with `status=PROCESSING`. If the worker crashes, `recoverStaleOutboxEvents()` routine resets locks older than 5 minutes.
- `BullMQ Jobs`: Idempotency keys (`jobId`) ensure that even if the queue crashes, a recovered worker won't execute identical jobs like SMS dispatches twice. Failed jobs are left explicitly for manual Dead Letter Queue (DLQ) inspection.

## External Provider Degradation

If an external API like OpenAI begins failing constantly:

- `CircuitBreaker` trips open and instantly rejects new tasks without waiting for timeouts.
- Background worker tasks get exponential backoffs applied inside BullMQ parameters, deferring the processing to when the provider resolves their downtime.
