import Link from "next/link";

import { NewTenantForm } from "@/components/new-tenant-form";
import { SignOutButton } from "@/components/sign-out-button";
import { getServerActorEmail } from "@/lib/actor-server";
import { listTenants } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const actorEmail = await getServerActorEmail();
  const tenants = await listTenants(actorEmail);

  return (
    <main className="page stack">
      <section className="card stack">
        <div className="row wrap" style={{ justifyContent: "space-between" }}>
          <h1 style={{ margin: 0 }}>Tphona - Ramp for Cell Service</h1>
          <SignOutButton />
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Multi-tenant eSIM management for business teams. Provision lines, dynamically allocate data,
          enforce budgets, and track spend in one dashboard.
        </p>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Create a new tenant workspace</h2>
        <p className="muted" style={{ margin: 0 }}>
          This creates a new company workspace and assigns you as tenant owner.
        </p>
        <NewTenantForm />
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Accessible tenant workspaces</h2>
        <p className="muted" style={{ margin: 0 }}>
          Open a tenant directly by slug. In production, Vercel Platforms host-based routing maps each
          tenant domain/subdomain to these same pages.
        </p>
        <p className="muted" style={{ margin: 0 }}>
          Authenticated actor: <strong>{actorEmail}</strong>
        </p>

        {tenants.length > 0 ? (
          <div className="row wrap">
            {tenants.map((tenant) => (
              <Link key={tenant.id} href={`/t/${tenant.slug}`}>
                {tenant.name} ({tenant.slug})
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No tenant memberships found for your account yet.
          </p>
        )}
      </section>
    </main>
  );
}
