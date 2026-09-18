# First 20 Client Operations Matrix

EstateScale operates as an optimized monolithic SaaS tracking highly deterministic workflows for luxury Real Estate organizations.

## 1. Metric Alert Monitoring

- **Platform Admins**: Will monitor the `/admin/ops` Operations Dashboard to track spikes in `Pending OutboxEvents`.
- **Latency Watch**: AI Execution (`aiUsageEvents`) must be manually parsed via `Pino` to track excessive prompt token rejections gracefully triggering CircuitBreakers.

## 2. Infrastructure Bound Safety Checks

1. Ensure the Node.js Background Worker scales reliably without overriding connections on Upstash Redis endpoints dynamically. (Bound connections efficiently < 50 for the 20-client limit).
2. Postgres tables containing `LeadIntelligence` are routinely verified across Analytics without cross-tenant boundaries bleeding natively.

## 3. Incident Rollback Policy

If an AI agent incorrectly scores batches of incoming SMS bounds:

1. Revoke the AI template bounding configurations inside `TemplateService` natively.
2. The Database is forward-rolled. Never wipe or execute destructive `deleteMany` schemas outside local test contexts.
3. Queue backlogs stuck in `PROCESSING` automatically resolve within 5m via `outbox-processor.ts` natively avoiding locked table hangs.
