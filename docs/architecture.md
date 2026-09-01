# EstateScale Architecture

## Product Purpose
EstateScale is an AI-powered Real Estate Lead Conversion Platform. It is a multi-tenant SaaS foundation designed to reliably support real estate client organizations operating simultaneously.

## System Architecture
EstateScale utilizes a **Modular Monolith** architecture.

## Architectural Principles
1. **Modular Monolith**: We explicitly **DO NOT** use Kubernetes, EKS, Kafka, MSK, or microservices at this stage.
2. **Cost-Conscious Infrastructure**: Designed to run inexpensively initially (1 application deployment, 1 PostgreSQL instance, 1 Redis instance, 1 worker).
3. **No Local File Storage**: The application must remain completely stateless regarding file storage.

## Multi-Tenancy & Authorization
- **Multi-Tenancy**: Shared database and shared schema approach (`organizationId`).
- **Organization Routing**: Users access their tenant data via `/org/[slug]/dashboard`.
- **Centralized Authorization**: Authorization is enforced entirely server-side.

## AI Lead Engine
- **Provider Abstraction**: Interacts safely with AI providers (OpenAI) via internal domain wrappers and the Vercel AI SDK.
- **Cost Controls & Usage Tracking**: Tracks estimated cost and token usage per-tenant via the `AiUsage` model.
- **Prompt Injection Defense**: Untrusted user contexts are explicitly physically separated from privileged System Instructions inside prompt construction mechanisms.

## Automation & Background Worker Engine
- **Event Bus**: Asynchronous decoupling of frontend requests using an in-memory `DomainEvent` dispatcher. Note: True PostgreSQL transactional outbox mechanisms guarding against absolute event loss upon crash between commit and dispatch are intentionally deferred natively to Phase 5 or production hardening cycles.
- **Redis & BullMQ**: Heavy or external processing tasks (like AI integrations) are pushed to a Redis queue reliably executing inside a disconnected worker context.
- **Idempotency & Recursion**: Automation limits recursive triggers via transactional database execution guards. Executions trace deterministic UUID structures to enforce exactly-once behavioral execution states even under redundant dispatch conditions.
