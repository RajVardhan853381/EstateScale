# Platform Operations & Admin Center

Phase 22 implements the strictly-isolated operations boundary allowing global EstateScale system administrators full visibility over the ecosystem without breaching standard tenant-layer permissions.

## 1. Platform-Admin Authorization
- Super Admin context is granted exclusively via the `PlatformAdmin` relation table bridging onto standard users.
- Normal `requireOrganizationMember` scopes CANNOT read global platform limits. Only operations gated behind `requirePlatformAdmin()` succeed.
- There are strictly zero "impersonate user" silent logic paths. All administrative actions require native system-level requests tied heavily to Pinot Audit logs.

## 2. Admin Dashboards
- `/admin/ops`: Central nexus detailing active aggregate limits: Tenants mapped, Global AI completions running, Transactional Outbox (BullMQ) Queue Backlogs safely querying DB schemas locally instead of opening heavy internal APIs.
- `/admin/ops/orgs`: Safe tabular search views traversing active tenants efficiently with built in `take: 50` DB bounds.
- `/admin/ops/health`: Taps `/api/ready` seamlessly rendering visual badges asserting Redis and Postgres dependencies aren't fragmented internally across worker sub-nodes.
