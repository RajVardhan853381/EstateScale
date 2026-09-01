# EstateScale Database Design

## Database Philosophy
EstateScale relies on **PostgreSQL** as its primary source of truth, utilizing **Prisma ORM**.

## Multi-Tenancy Strategy
The database employs a **Shared Database, Shared Schema** strategy. Tenant isolation is achieved by enforcing a strict `organizationId` foreign key.

## Core Entities
- **User**: Represents a global authenticated individual.
- **Organization**: The tenant boundary.
- **OrganizationMembership**: The junction table connecting `User` and `Organization`.
- **Contact / Lead**: The core multi-tenant CRM relationship entities defining pipelines and attributes.
- **AiAssessment / AiUsage**: Retains non-intrusive metadata regarding analytical reasoning and token expenditures safely isolated per lead.
- **Automation / AutomationExecution**: Decouples automated triggers safely inside deterministic states tracing completion bounds accurately.

## Indexing Strategy
Composite indexes utilizing `organizationId` are crucial.

## Tenant Isolation
Every query affecting or retrieving tenant data MUST include a `WHERE organizationId = ?` clause.
