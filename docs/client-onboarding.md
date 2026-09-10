# EstateScale Client Onboarding

## Overview

The goal is to safely take a client from "New Customer" to a "Fully Configured EstateScale Workspace" without manual database changes.

## Steps

1. **Create Client:**
   An internal superadmin uses `/admin/onboarding` to create an organization and invite the primary admin.

2. **Configure Organization:**
   Organization state is initialized in the DB, giving them default CRM pipelines and stages.

3. **Invite Administrator:**
   A secure, single-use, expiring token is generated.

4. **Onboarding Wizard (`/org/[slug]/onboarding`):**
   The primary admin clicks the invitation, signs in, and enters the wizard.

5. **Configure CRM:**
   Review pipeline settings.

6. **Import Leads:**
   Upload CSV via the Import step.

7. **Configure AI / Communication:**
   Enable or disable optionally.

8. **Activate Organization:**
   The final step in the wizard validates if the required steps (admin presence) are met, and marks the org as `ACTIVE`.

9. **Troubleshoot / Invites:**
   Internal admins can track the org status in the `OrganizationSetupState` table, or from the UI.
