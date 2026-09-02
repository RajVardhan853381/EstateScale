# EstateScale Risk Register

| Risk | Description | Impact | Likelihood | Mitigation | Current Phase Status |
|---|---|---|---|---|---|
| **1. Tenant data leakage** | A user accesses Organization B data. | Critical | Low | Enforce `organizationId` scoping strictly. | Mitigated |
| **2. Authentication vulnerabilities** | Unsafe passwords. | High | Low | Use NextAuth and bcryptjs. | Addressed |
| **3. AI Prompt Injection** | Lead manipulates instructions to perform invalid tasks. | High | Medium | Isolate contexts strictly inside untrusted blocks. Avoid overriding prompt layers natively. | Mitigated |
| **4. AI API Rate Limit Exhaustion / Uncontrolled Execution** | Queues cascade firing overlapping infinite limits leading to massive API costs. | Critical | High | Implement BullMQ exponential retries alongside deterministic execution UUID constraints guarding identical trigger scopes recursively. | Mitigated |
| **5. Unverified Webhook Ingress Abuse** | Attackers forge Twilio payloads to insert fake SMS data or exhaust resources. | High | Medium | Implement strict Twilio webhook signature cryptographic validation. | Mitigated |
| **6. TCPA / Carrier Compliance Failure** | Application continues attempting to SMS an opted-out recipient, resulting in vendor ban. | High | Low | Capture 'opt_out' error codes safely during transit; auto-update `Conversation` opt-out statuses dynamically. | Mitigated |
| **7. Manual SMS Execution Crashes via Background Automation Injection** | Users drafting custom SMS overwrite AI logic failing DB validation bounds. | High | Low | Segregate queue processor jobs deterministically using schema discriminators routing manual logic cleanly independent of `AutomationExecution` states entirely natively. | Mitigated |
