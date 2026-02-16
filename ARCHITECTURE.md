# eSIM Business Platform - Architecture

## 1. Goals

- Support multi-tenant B2B organizations on a single platform
- Enable API-driven eSIM lifecycle management for employees
- Provide usage/spend analytics with policy enforcement
- Keep provider integrations replaceable through an abstraction layer
- Deploy on Vercel with production-grade operational visibility

## 2. Non-Goals (MVP)

- Building our own MVNO/carrier core
- Real-time packet-level telecom mediation
- Full accounting ERP replacement
- Complex workflow builders (beyond a few policy automations)

## 3. High-Level System Design

```text
+----------------------------+        +---------------------------+
| Web App (Next.js on Vercel)| <----> | API Routes / Server Logic |
+-------------+--------------+        +------------+--------------+
              |                                        |
              v                                        v
      +-------+--------+                     +---------+---------+
      | Tenant Resolver|                     | Provider Adapter  |
      | (subdomain/domain)|                  | (1GLOBAL first)   |
      +-------+--------+                     +---------+---------+
              |                                        |
              v                                        v
      +-------+----------------------------+   +-------+------------------+
      | Postgres (tenant-scoped data)      |   | eSIM Vendor APIs/Webhooks|
      +-------+----------------------------+   +-------+------------------+
              |
              v
      +-------+----------------------------+
      | Jobs/Cron + Analytics Aggregations |
      +------------------------------------+
```

## 4. Multi-Tenancy with Vercel Platforms Patterns

Use Vercel Platforms-style tenant routing:

- `tenant.example.com` -> tenant context
- Optional custom domain mapping per tenant
- Middleware resolves incoming host -> tenant record

### Tenant Isolation Strategy

MVP: shared database with strict `tenant_id` scoping on all business tables.

Required controls:

- `tenant_id` added to every tenant-owned entity
- Authorization checks enforce tenant boundary on every request
- Query helpers centralize tenant-scoped data access
- Audit logs include `tenant_id`, actor, action, and entity

Future: ability to move high-scale tenants to dedicated databases.

## 5. Core Services and Boundaries

## 5.1 Next.js Application Layer

- App Router for UI and server actions
- Route handlers for internal API endpoints
- Dashboard modules:
  - Overview (active lines, usage, spend)
  - Employees
  - Plans/Policies
  - Alerts
  - Billing/Exports

## 5.2 Auth & Authorization

- SSO-ready identity provider integration (OIDC/SAML)
- Session includes `tenant_id` + role claims
- RBAC roles:
  - Owner/Admin: full control
  - Finance: spend and billing controls
  - Manager: team-level controls
  - Viewer: read-only insights

## 5.3 Provider Integration Layer

Create an internal interface so app logic does not depend directly on any single vendor SDK/API.

```ts
interface EsimProvider {
  issueEsim(input: IssueEsimInput): Promise<IssueEsimResult>;
  assignPlan(input: AssignPlanInput): Promise<AssignPlanResult>;
  changePlan(input: ChangePlanInput): Promise<ChangePlanResult>;
  suspendLine(input: SuspendLineInput): Promise<ActionResult>;
  reactivateLine(input: ReactivateLineInput): Promise<ActionResult>;
  terminateLine(input: TerminateLineInput): Promise<ActionResult>;
  fetchUsage(input: FetchUsageInput): Promise<UsageRecord[]>;
  verifyWebhook(input: VerifyWebhookInput): Promise<WebhookEvent>;
}
```

MVP implementation:

- `OneGlobalProvider` as first concrete adapter
- Normalized internal models for line state, plan state, and usage records
- Idempotent command handling for retries and webhook duplication

## 5.4 Analytics & Policy Engine

Data paths:

1. **Pull** usage snapshots on a schedule (hourly/daily)
2. **Receive** vendor webhooks for lifecycle events
3. **Aggregate** into tenant metrics tables for fast dashboards
4. **Evaluate** policy thresholds and emit alerts/actions

Policy examples:

- Employee monthly data cap
- Team budget cap
- International roaming allowed/blocked
- Auto-suspend line if hard cap exceeded

## 6. Data Model (MVP)

Representative tables:

- `tenants`
- `tenant_domains`
- `users`
- `memberships` (user <-> tenant with role)
- `employees` (HR identity)
- `lines` (one per active eSIM assignment)
- `plans` (catalog + tenant-allowed plans)
- `line_plan_history`
- `usage_events` (raw normalized usage imports)
- `usage_daily_rollups`
- `budgets` (employee/team/cost_center scopes)
- `alerts`
- `invoices` / `invoice_line_items`
- `audit_logs`
- `webhook_events` (dedupe + replay support)

Key invariants:

- Every tenant-owned row has `tenant_id`
- External provider IDs stored for reconciliation
- Soft deletes for operational traceability where needed

## 7. Request and Event Flows

## 7.1 Provision Employee Line

1. Admin selects employee + plan
2. API validates budget/policy constraints
3. `EsimProvider.issueEsim` + `assignPlan`
4. Persist line with provider references
5. Generate QR/activation details for employee
6. Emit audit event + optional notification

## 7.2 Usage Ingestion

1. Cron job requests usage from provider adapter
2. Upsert `usage_events` idempotently
3. Compute rollups
4. Re-evaluate policy thresholds
5. Create alerts and optional automated actions

## 7.3 Lifecycle Webhooks

1. Vendor sends event
2. Verify signature
3. Deduplicate event ID
4. Update line status/history
5. Trigger user-facing alert if action required

## 8. API Surface (Internal)

Illustrative route groups:

- `POST /api/tenants/:tenantId/employees`
- `POST /api/tenants/:tenantId/lines/provision`
- `POST /api/tenants/:tenantId/lines/:lineId/suspend`
- `POST /api/tenants/:tenantId/lines/:lineId/reactivate`
- `GET /api/tenants/:tenantId/usage`
- `GET /api/tenants/:tenantId/spend`
- `POST /api/providers/1global/webhook`

## 9. Security & Compliance

- Encrypt secrets via Vercel environment variables
- Signed webhook verification for all provider events
- Least-privilege service credentials
- Full audit trail for provisioning and policy changes
- PII minimization and retention rules for usage data
- Tenant-aware authorization checks in every write path

## 10. Deployment Topology (Vercel)

- **Preview**: per-PR deployment for safe review
- **Production**: main branch deployment
- **Env vars**: separated by environment
- **Scheduled jobs**: Vercel Cron triggering ingestion endpoints
- **Background processing**: queue-backed workers for heavier sync tasks

## 11. Observability

- Structured app logs (`tenant_id`, `actor_id`, `request_id`)
- Error tracking on API and webhook handlers
- Metrics:
  - Provisioning latency
  - Webhook processing success rate
  - Usage ingestion freshness
  - Alert volume and auto-action outcomes

## 12. Scalability Strategy

- Cache tenant/domain lookups
- Partition high-volume usage tables by date
- Move long-running tasks to async workers
- Add provider failover support via adapter registry
- Introduce dedicated data plane for large tenants as needed

## 13. Build Phases

### Phase 1 (MVP Foundation)

- Tenant routing + RBAC
- Employee/line management
- 1GLOBAL adapter for provisioning + usage ingest
- Basic dashboards and alerting

### Phase 2 (Operational Maturity)

- Budget automation rules
- Finance-grade exports and invoicing improvements
- HRIS integrations and lifecycle automation

### Phase 3 (Network Intelligence)

- Multi-provider strategy
- Optimization recommendations and forecasting
- Advanced spend controls and anomaly detection
