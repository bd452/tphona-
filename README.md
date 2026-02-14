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

4. Start dev server:

   ```bash
   npm run dev
   ```

5. Open:

   - Landing page: `http://localhost:3000`
   - Acme tenant: `http://localhost:3000/t/acme`
   - Globex tenant: `http://localhost:3000/t/globex`

## Multi-Tenancy Notes

- Proxy rewrites host-routed tenant requests to `/t/[tenantSlug]/*`.
- For local development, direct path-based routing (`/t/acme`) is easiest.
- Host rewrites support `*.localhost` and `*.${NEXT_PUBLIC_ROOT_DOMAIN}` subdomain routing.
- Every tenant-owned record is scoped by `tenant_id`.
- All route handlers resolve an actor email and enforce tenant membership before any read/write.
- `supabase/schema.sql` includes row-level security policies to harden data isolation in Supabase.

## API Highlights

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
- `POST /api/providers/1global/webhook`

## Actor Context (Demo)

- For local/demo mode, actor identity defaults to `DEMO_USER_EMAIL`.
- APIs also accept `x-user-email` to emulate different actors for testing authorization boundaries.
- In production, map this to Supabase Auth / SSO identity and remove header-based simulation.