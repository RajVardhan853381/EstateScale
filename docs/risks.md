# Risks & Mitigations

- **Cross-tenant Data Leakage**: Mitigated entirely via mandatory enforcement of `requireOrganizationMember` prior to any DB operation and schema-level indexing on `organizationId`.
- **Database Scale (Phase 2 CRM lists)**: Unbounded queries avoided. All endpoints handling Lead Activity or large sets enforce finite limits and standard server-side pagination.
