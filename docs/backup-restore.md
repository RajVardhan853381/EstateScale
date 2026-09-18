# Backup & Restore Runbook

EstateScale utilizes PostgreSQL as its primary persistent database. Operations surrounding backup/restores rely largely on the chosen infrastructure provider (e.g. AWS RDS, Vercel Postgres, Supabase).

## 1. Backup Strategy

- **Provider Managed:** EstateScale assumes automated provider backups are enabled, storing WAL (Write-Ahead Logs) for Continuous Point-In-Time-Recovery (PITR).
- **RPO (Recovery Point Objective):** Dependent on WAL synchronization delays, typically 5 minutes.
- **RTO (Recovery Time Objective):** Dependent on database size; expect up to 60 minutes for a complete infrastructure spin-up and block storage restore on standard tiers.

## 2. Restore Procedure (Operational Steps)

1. **Quarantine:** Immediately isolate application web traffic (e.g. routing CDN traffic to a static maintenance page) to prevent writing split-brain data.
2. **Execute Restore:** Trigger the provider's snapshot restore console UI.
3. **Migrate Connections:** Update the `DATABASE_URL` environment variables pointing to the newly restored cluster endpoint.
4. **Validation:** Run standard backend readiness checks via `/api/ready` against the restored DB.
5. **Resume Traffic:** Drop the CDN quarantine.

## 3. Current Limitations

- EstateScale does not currently execute internal script-based logical `pg_dump` jobs; it strictly assumes underlying block-level backups via provider configuration.
- Real production restore drills remain pending manual execution.
