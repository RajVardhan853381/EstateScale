# EstateScale Risk Register

| Risk | Description | Impact | Likelihood | Mitigation | Current Phase Status |
|---|---|---|---|---|---|
| **1. Tenant data leakage** | A user accesses Organization B data. | Critical | Low | Enforce `organizationId` scoping strictly. | Mitigated |
| **2. Authentication vulnerabilities** | Unsafe passwords. | High | Low | Use NextAuth and bcryptjs. | Addressed |
