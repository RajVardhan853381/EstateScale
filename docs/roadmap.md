# EstateScale Roadmap

## Phase 1: Foundation (Completed)
- Project initialization
- Database & Prisma setup
- Authentication
- Organizations, Memberships, and RBAC

## Phase 2: CRM + Lead Management (Completed)
- Contacts, Leads, Pipelines, and Activity timelines.

## Phase 3: AI Lead Engine (Completed)
- Analyzes context safely, extracts entities, and scores leads.
- Drafts responses securely behind authorization layers.

## Phase 4: Automation Engine + Background Job Infrastructure (Completed)
- Replaces synchronous processing bottlenecks with asynchronous Event queues targeting isolated Worker environments mapped onto Redis.

## Phase 5: SMS + Communication Engine (Completed)
- Bidirectional Twilio SMS integration.
- Inbound webhooks safely mapped to tenant resources.
- UI Conversation Threads displaying SMS history.
- Distinct explicit pipeline isolation bounds strictly routing `MANUAL_SMS` workflows securely separate from AI-generated `AUTOMATED_SMS` recursive logic natively.

## Future Work (DO NOT IMPLEMENT IN CURRENT PHASES)
- Social AI
- Voice AI
- WhatsApp integration
- Billing and Usage-based pricing
