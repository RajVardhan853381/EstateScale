# Architecture

EstateScale is a Multi-tenant B2B SaaS for real-estate built as a modular monolith.

## Core Tenets
- **Framework**: Next.js App Router (TypeScript, Tailwind CSS)
- **Database**: PostgreSQL (Prisma ORM)
- **Auth**: NextAuth + strictly centralized RBAC middleware (`requireOrganizationMember`).
- **Isolation**: Path-based `/org/[slug]` ensuring strictly isolated data domains without database sharding (for cost efficiency).

## CRM Domain (Phase 2)
Services in `src/lib/services/` execute transactional, tenant-safe Prisma operations validated against Zod schemas (`src/lib/validations/crm.ts`). UI relies on shadcn React components.
