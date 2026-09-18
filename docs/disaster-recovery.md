# Disaster Recovery (DR)

This outlines protocols during catastrophic infrastructure degradation.

## 1. Outage Handling

### A. Database Outage

- Impact: System immediately ceases accepting traffic (Returns HTTP 503 from `/api/ready`).
- Recovery: Follow `docs/backup-restore.md` if data corruption occurred. Otherwise, wait for provider hardware recovery. Application components strictly restart with Backoff loops.

### B. Redis Outage

- Impact: Caching, rate limiters, and BullMQ background workers degrade. Web application remains _partially online_ serving cached DB reads and synchronously committing Outbox mutations.
- Recovery: Reboot Redis container/cache cluster. Wait for `outbox-processor.ts` to automatically re-sync un-dispatched Queue events.

### C. Twilio / AI Provider Outage

- Impact: Communication flows halt. `CircuitBreaker` trips (OPEN state) rejecting AI analysis requests to prevent bounded thread starvation.
- Recovery: Services will automatically poll via exponential backoff. Once provider status turns green, `CircuitBreaker` will automatically transition to `HALF_OPEN` -> `CLOSED`.

## 2. Integrity Verification

Post-recovery, manual integrity validation scripts should verify that `OutboxEvent` status bounds match dispatched `AutomationExecution` states.
