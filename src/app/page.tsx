import Link from "next/link";

import { listTenants } from "@/lib/store";

export default function HomePage() {
  const tenants = listTenants();

  return (
    <main className="page stack">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Tphona - Ramp for Cell Service</h1>
        <p className="muted" style={{ margin: 0 }}>
          Multi-tenant eSIM management for business teams. Provision lines, dynamically allocate data,
          enforce budgets, and track spend in one dashboard.
        </p>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Sample tenant workspaces</h2>
        <p className="muted" style={{ margin: 0 }}>
          Open a tenant directly by slug. In production, Vercel Platforms host-based routing maps each
          tenant domain/subdomain to these same pages.
        </p>

        <div className="row wrap">
          {tenants.map((tenant) => (
            <Link key={tenant.id} href={`/t/${tenant.slug}`}>
              {tenant.name} ({tenant.slug})
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
