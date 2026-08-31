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
