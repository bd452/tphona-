import { notFound } from "next/navigation";

import { TenantNav } from "@/components/tenant-nav";
import { getTenantBySlug } from "@/lib/store";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenantSlug } = await params;
  const tenant = getTenantBySlug(tenantSlug);

  if (!tenant) {
    notFound();
  }

  return (
    <main className="page stack">
      <section className="card stack">
        <div className="row wrap" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0 }}>{tenant.name}</h1>
            <p className="muted" style={{ margin: "0.2rem 0 0 0" }}>
              Tenant slug: {tenant.slug} | Provider: {tenant.provider}
            </p>
          </div>
        </div>
        <TenantNav tenantSlug={tenant.slug} />
      </section>
      {children}
    </main>
  );
}
