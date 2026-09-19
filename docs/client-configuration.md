# Client Configuration & Templates

EstateScale enables multi-tenant capabilities dynamically through Template records. This allows Client organizations to instantiate CRM structures and Journeys independently without Developer database deployments.

## 1. Global vs Tenant Templates

- **Global Templates:** Seeded directly into the database where `organizationId = null`. These are system defaults (e.g. Default Buyer Pipeline, Starter Lead Qualifications).
- **Tenant Templates:** Tenant admins can duplicate any Global template into their workspace. When duplicated, `organizationId = org_id`, making the configuration exclusively theirs to modify.

## 2. Protected Scopes

- A tenant **cannot** edit Global Templates.
- A tenant **cannot** read or duplicate Templates owned by another active Tenant Workspace.

## 3. Onboarding Lifecycle

Upon executing `OnboardingService.createOrganization`, the system automatically polls all Global Templates and creates initial scoped copies for the incoming Client organization, enabling immediate operational usage via the `TemplatesSettingsPage` inside the Application Settings panel.
