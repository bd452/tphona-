# Tphona - eSIM Business Platform

Ramp-style spend control and lifecycle management for employee mobile service using eSIM.

This repository now includes:

- `SUMMARY.md` - product summary and goals
- `ARCHITECTURE.md` - technical architecture blueprint
- A working Next.js application prototype with:
  - Multi-tenant routing model (`/t/[tenantSlug]` + host rewrite middleware)
  - Tenant-scoped APIs for employees, line provisioning, lifecycle actions, usage, spend, and alerts
  - Provider adapter abstraction with a mock 1GLOBAL implementation
  - Dashboard pages for overview, employees, lines, usage analytics, spend analytics, and alerts

## Stack

- Next.js (App Router) + TypeScript
- Vercel-ready deployment model
- Vercel Platforms-style host-based tenant routing pattern
- In-memory data store for prototype behavior (replace with Postgres in production)

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local env file:

   ```bash
   cp .env.example .env.local
   ```

3. Start dev server:

   ```bash
   npm run dev
   ```

4. Open:

   - Landing page: `http://localhost:3000`
   - Acme tenant: `http://localhost:3000/t/acme`
   - Globex tenant: `http://localhost:3000/t/globex`

## Multi-Tenancy Notes

- Middleware rewrites host-routed tenant requests to `/t/[tenantSlug]/*`.
- For local development, direct path-based routing (`/t/acme`) is easiest.
- Host rewrites are enabled for subdomains such as `acme.localhost` and `globex.localhost`.

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

## Important Prototype Limitation

The current implementation uses an in-memory store for fast iteration and demo behavior. In production,
replace store internals with Postgres + background workers and enforce full auth/SSO and tenant-level
authorization middleware.