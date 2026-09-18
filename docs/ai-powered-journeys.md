# AI-Powered Journeys (Phase 16)

## Architecture
Phase 16 extends the basic Automation Engine (Phase 4) into a durable, multi-step customer journey orchestrator natively backed by PostgreSQL. Redis/BullMQ are explicitly used solely as an ephemeral execution pipeline with durable state recovery bounds inside Prisma.

## Capabilities
- Trigger mapping natively tied to internal Event domains safely wrapping AI metrics.
- Enrolls mapped safely limiting concurrency.
- Built-in conditional gating (score constraints).
- Safe internal worker execution bound specifically to AI/Copilot rulesets explicitly prohibiting direct schema mutation.

## Semantics
- **Enrollments:** Unique conditionally scoped on `(journeyId, leadId, status)`. Meaning a `Lead` may legitimately participate in multiple independent journeys (Hot Buyer, Post-Viewing, etc.) safely natively.
- **State Engine:** Safe wait state execution bounds (PAUSED, WAITING) persist durably across restarts.
