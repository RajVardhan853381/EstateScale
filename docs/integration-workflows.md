# Integration Workflows (End-to-End)

## Golden Workflow 1: The Automated AI Pipeline

1. `CRM`: Lead is created manually or via import.
2. `AI Lead Intelligence`: Lead metadata is synchronously piped into `analyzeLead`. Strict Zod extraction occurs.
3. `Event Bus`: Analysis generates `AI_ANALYSIS_COMPLETED` domain event with scoring metadata.
4. `Automations`: Engine traps event, evaluates rules (e.g. `Score > 80`).
5. `Journeys`: Eligible Lead is enrolled. Worker pulls step.
6. `Communications`: Action step calls `executeSendSms`. Transactional outbox persists SMS body.
7. `Outbox Processor`: Worker polls DB, acquires lock, dispatches to Twilio natively. DB records `SENT` status.
8. `Analytics`: Completed Journeys and Outbound Message KPI tables correctly roll-up states inside the `AnalyticsService` layer without duplicate counts.

## Golden Workflow 2: Inbound Webhooks

1. `Communications`: Twilio strikes `/api/webhooks/twilio/sms`.
2. `CRM`: Validates provider HMAC signature, resolves Tenant context from `To` Phone Number.
3. `Event Bus`: Payload drops `MESSAGE_RECEIVED` domain event.
4. `Intelligence`: Automations trigger contextual AI Copilot summarization or downstream logic based on received keyword contexts.
