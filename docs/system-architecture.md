# EstateScale System Architecture

EstateScale is designed as a **Modular Monolith** optimizing for multi-tenancy (~20 active orgs).

## 1. Core Paradigm
- **Runtime**: Next.js App Router (Node.js backend)
- **Database**: PostgreSQL (via Prisma ORM) with strict query-level tenant isolation (`organizationId`).
- **Asynchronous Engine**: Background `worker.ts` polling BullMQ (Redis) exclusively handling external provider communications and durable Journey state machine execution.

## 2. Integrated Product Modules
- **CRM / Intelligence**: Leads are ingested, automatically routed to the AI Provider abstraction (e.g. OpenAI), scored, and re-persisted.
- **Automations / Journeys**: `EventBus` traps entity mutations, queues them into BullMQ, and a durable worker executes branching steps safely tracking idempotency in PostgreSQL (`JourneyExecution`).
- **Communications**: SMS (Twilio) payloads execute out of the worker process relying on a strictly locked Transactional Outbox processor (`OutboxEvent` -> `redisClient`).

## 3. Resilience Layers
- **CircuitBreaker**: Drops inbound AI/Communication requests instantly if underlying 3rd parties undergo outages.
- **Rate Limiters**: Redis-backed limits aggressively protect public `/api/invite` boundaries.
