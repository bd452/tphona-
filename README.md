# Tphona - eSIM Business Platform

Ramp-style spend control and lifecycle management for employee mobile service using eSIM.

This repository now includes:

- `SUMMARY.md` - product summary and goals
- `ARCHITECTURE.md` - technical architecture blueprint
- A working Next.js application prototype with:
  - Multi-tenant routing model (`/t/[tenantSlug]` + host rewrite proxy)
  - Tenant-scoped APIs for employees, line provisioning, lifecycle actions, usage, spend, and alerts
  - Provider adapter abstraction with a mock 1GLOBAL implementation
  - Dashboard pages for overview, employees, lines, usage analytics, spend analytics, and alerts

## Stack

- Next.js (App Router) + TypeScript
- Vercel-ready deployment model
- Vercel Platforms-style host-based tenant routing pattern
- **Supabase Postgres** persistence
- Supabase-style tenant isolation model (tenant IDs + memberships + RLS-ready schema)

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local env file:

   ```bash
   cp .env.example .env.local
   ```

3. Apply Supabase schema:

   - Open your Supabase SQL editor and run `supabase/schema.sql`

4. Create Supabase Auth users:

   - In Supabase dashboard -> Authentication -> Users, create users matching seeded membership emails:
     - `owner@acme.example`
     - `finance@acme.example`
     - `admin@globex.example`

5. Start dev server:

   ```bash
   npm run dev
   ```

6. Open:

   - Login page: `http://localhost:3000/login`
   - Landing page (after auth): `http://localhost:3000`
   - Acme tenant: `http://localhost:3000/t/acme`
   - Globex tenant: `http://localhost:3000/t/globex`

## Multi-Tenancy Notes

- Proxy rewrites host-routed tenant requests to `/t/[tenantSlug]/*`.
- For local development, direct path-based routing (`/t/acme`) is easiest.
- Host rewrites support `*.localhost` and `*.${NEXT_PUBLIC_ROOT_DOMAIN}` subdomain routing.
- Every tenant-owned record is scoped by `tenant_id`.
- Actor identity is resolved from Supabase Auth session cookies (no header fallback).
- Route handlers enforce tenant membership before every tenant-scoped read/write.
- `supabase/schema.sql` includes row-level security policies to harden data isolation in Supabase.
- Runtime tenant operations use session-scoped Supabase clients so RLS and app-level checks both apply.
- Service-role credentials are reserved for provider webhook ingestion and other non-user system flows.
- Tenant onboarding uses database function `create_tenant_with_owner(...)` to create tenant + owner membership atomically.

## API Highlights

- `GET/POST /api/platform/tenants`
- `GET/POST /api/tenants/:tenantId/employees`
- `GET /api/tenants/:tenantId/lines`
- `POST /api/tenants/:tenantId/lines/provision`
- `POST /api/tenants/:tenantId/lines/:lineId/suspend`
- `POST /api/tenants/:tenantId/lines/:lineId/reactivate`
- `POST /api/tenants/:tenantId/lines/:lineId/terminate`
- `POST /api/tenants/:tenantId/lines/:lineId/plan`
- `POST /api/tenants/:tenantId/lines/:lineId/allocate`
- `GET /api/tenants/:tenantId/usage?sync=true`
- `GET /api/tenants/:tenantId/spend`
- `GET /api/tenants/:tenantId/alerts`
- `GET/POST /api/tenants/:tenantId/memberships`
- `GET/POST /api/tenants/:tenantId/domains`
- `POST /api/providers/1global/webhook`

## Auth and Access Model

- Login is handled via Supabase Auth on `/login`.
- Session cookies identify the actor server-side for pages and APIs.
- Tenant access is granted only when the actor email exists in `memberships` for that tenant.
- Role checks are enforced in API actions (`owner/admin/manager/finance/viewer`).