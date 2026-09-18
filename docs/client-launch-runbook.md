# Client Onboarding & Launch Runbook

This runbook outlines the required sequence to bring a new Client (Tenant Organization) into active status securely utilizing Phase 21 infrastructure mappings.

## 1. Zero-Trust Instantiation

1. **Creation**: Global Admin executes `OnboardingService.createOrganization` emitting a globally un-guessable UUID Slug.
2. **Template Duplication**: EstateScale automatically pulls standard System Base Templates (Global Default Pipelies, Base AI instructions) and replicates them into `Organization` bounds via isolated configurations.

## 2. Admin Onboarding

1. **Role Handover**: The target organization Owner is invited explicitly using the newly generated cryptographic `/invite/[token]` endpoints.
2. **Configuration Settings**: Admin natively accesses their settings bounds, editing `CRM_PIPELINE` or `JOURNEYS` safely scaling them against their organizational goals without breaching into generic Platform defaults.

## 3. Communication Bound Initialization

1. Platform operator attaches unique `TWILIO_SENDER_ID` values inside `OrganizationCommunicationConfig` allowing automated messages scaling efficiently securely tracking `message` boundaries.

## 4. Operational Transition

1. Analytics triggers are reviewed.
2. Initial CSV leads imported (Batched strictly below 5k limits).
3. The Admin executes Phase 17 logic converting the Org state into strictly `ACTIVE` seamlessly executing Copilot and AI operations actively tracking tokens billed natively.
