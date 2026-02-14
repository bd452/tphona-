# eSIM Business Platform - Product Summary

## Vision

Build a "Ramp for cell service": a multi-tenant SaaS platform where companies can issue, manage, and optimize employee mobile connectivity via eSIM, with real-time spend control and analytics.

## Core Problem

Business mobile plans are usually managed through manual carrier portals, spreadsheets, and slow support processes. This creates:

- Poor visibility into usage and spend by employee or team
- Slow onboarding/offboarding for mobile service
- Weak policy controls (overages, roaming, unused lines)
- Limited ability to reallocate connectivity dynamically

## Proposed Solution

Create a web platform that lets businesses:

1. Provision and assign eSIM plans to employees instantly
2. Dynamically allocate data and policy limits per employee/team
3. Track usage, spend, and anomalies in near real-time
4. Enforce budget guardrails (caps, alerts, auto-throttling/suspension)
5. Manage lifecycle events (activate, transfer, suspend, terminate)

## Initial eSIM Vendor Choice

**Primary vendor recommendation: 1GLOBAL (Truphone/1GLOBAL APIs)**.

Why this is a strong starting point:

- Enterprise-oriented eSIM lifecycle capabilities
- Global coverage suitable for distributed teams
- API-first integration model for provisioning and state changes
- Strong fit for embedded telco experiences in B2B software

Implementation note: architect behind an internal provider adapter so additional vendors can be introduced later without rewriting core business logic.

## Technology Stack

- **Frontend/App**: Next.js (App Router) + TypeScript
- **Hosting/Runtime**: Vercel
- **Multi-tenancy foundation**: Vercel Platforms patterns (subdomain + custom domain tenancy)
- **Data**: Postgres (tenant-scoped relational model)
- **Background jobs**: Vercel Cron + queue/worker for usage sync and alerts
- **Auth**: SSO-ready auth layer (OIDC/SAML-capable provider)
- **Observability**: structured logs, audit events, and metrics dashboards

## MVP Scope

### Tenant & Admin

- Tenant creation and organization settings
- Role-based access (Owner, Admin, Finance, Manager, Viewer)
- Domain/subdomain-based tenant routing

### Employee Connectivity Management

- Employee directory (manual CSV import in MVP)
- eSIM issuance and assignment
- Plan allocation and plan changes
- Line lifecycle actions (suspend/reactivate/terminate)

### Controls & Policy

- Budget caps by employee/team/cost center
- Roaming and usage policy presets
- Alert thresholds for abnormal usage

### Analytics & Finance

- Usage dashboard by employee/team/time
- Spend dashboard and cost center breakdown
- Exportable billing/usage reports (CSV)

## Near-Term Roadmap (Post-MVP)

- HRIS sync (Rippling, Workday, BambooHR)
- Automatic onboarding/offboarding workflows
- Chargeback automation to internal cost centers
- Forecasting and optimization recommendations
- Multi-vendor eSIM routing and failover

## Success Metrics

- Time to provision line: < 2 minutes
- Monthly overage reduction: >= 25%
- Unused line reduction: >= 30%
- Finance reconciliation time reduction: >= 50%
- Admin NPS/CSAT improvement for IT/Finance teams
