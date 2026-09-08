# Database Architecture

## Phase 2 additions
- **Contact**: Standardized representation of people across leads.
- **Lead**: Core entity for sales tracking, references Contact, OrganizationMembership (Assignee), and Pipeline Stages.
- **LeadActivity**: Audit log and timeline history of Lead mutations (status changes, assignments, creation).
- **Note**: Tenant-scoped unstructured text related to a Lead.
- **Tag**: Extensible string tagging, unique by name per Organization.
- **Pipeline & PipelineStage**: Defines the sales process. The system ensures a default pipeline via safe, idempotent scripts.

## Tenant Isolation
All major domain entities strictly declare `organizationId`. Isolation is enforced inside server actions utilizing `requireOrganizationMember` prior to Prisma queries.
