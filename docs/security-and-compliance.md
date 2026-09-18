# Security & Compliance

EstateScale is designed with enterprise-grade security and compliance readiness in mind. This document outlines the architectural boundaries and defense mechanisms implemented.

## 1. Authentication & Session Security
- Authentication is built on Auth.js.
- Sessions are strictly validated against `PrismaAdapter`.
- Revoked users immediately lose access to internal organizational data via RBAC boundaries.
- Password hashes (if using credentials) rely on strong bcrypt routines.

## 2. Authorization & Tenant Isolation
- **Server-Side Verification**: Role-Based Access Control (RBAC) relies purely on server-side validations (e.g. `requireRole()`).
- **Data Boundaries**: Tenant isolation is achieved through hardcoded `organizationId` matching in Prisma queries.
- Cross-tenant requests immediately throw `Forbidden: Tenant isolation violation`.

## 3. Data Privacy & Minimization
- System interactions minimize Personal Identifiable Information (PII).
- **Pino Logger** redacts sensitive patterns such as tokens, passwords, cookies, authorization headers, phones, and emails.
- AI systems execute against highly structured validation schemas (Zod).

## 4. AI Prompt Injection Defenses
- Strict demarcation between instructions (system prompts) and contextual untrusted data (Lead data).
- System prompts are hardcoded to ignore any nested command/jailbreak injections originating from untrusted input fields.
- The AI has zero direct access to the database or SQL routines; all interactions traverse safe CRUD abstractions.

## 5. Webhook Security
- Providers (e.g., Twilio) undergo strict cryptographic signature validations (`x-twilio-signature`).

## 6. External Import Security
- CSV imports limit row size and apply data sanitization to prevent Spreadsheet Formula Injections.
- CSVs larger than 5MB are automatically dropped by the application layer.

## 7. Web Application Firewalls
- Content-Security-Policy (CSP) is explicitly enforced, severely restricting remote code execution.
- Clickjacking and strict transport policies (`DENY` X-Frame-Options, `nosniff` X-Content-Type) are embedded natively in the Next.js runtime.

*EstateScale implements tenant isolation, RBAC, audit logging, data protection controls, and AI safety controls.*
