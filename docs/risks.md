# EstateScale Risk Register

| Risk | Description | Impact | Likelihood | Mitigation | Current Phase Status |
|---|---|---|---|---|---|
| **1. Tenant data leakage** | A user accesses Organization B data. | Critical | Low | Enforce `organizationId` scoping strictly. | Mitigated |
| **2. Authentication vulnerabilities** | Unsafe passwords. | High | Low | Use NextAuth and bcryptjs. | Addressed |
| **3. AI Prompt Injection** | Lead manipulates instructions to perform invalid tasks. | High | Medium | Isolate contexts strictly inside untrusted blocks. Avoid overriding prompt layers natively. | Mitigated |
| **4. AI API Rate Limit Exhaustion / Uncontrolled Execution** | Queues cascade firing overlapping infinite limits leading to massive API costs. | Critical | High | Implement BullMQ exponential retries alongside deterministic execution UUID constraints guarding identical trigger scopes recursively. | Mitigated |
