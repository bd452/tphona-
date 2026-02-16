import { notFound } from "next/navigation";

import { TenantSettingsPanel } from "@/components/tenant-settings-panel";
import { getServerActorEmail } from "@/lib/actor-server";
import { getTenantBySlug, listTenantDomains, listTenantMembers } from "@/lib/store";

interface SettingsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { tenantSlug } = await params;
  const actorEmail = await getServerActorEmail();
  const tenant = await getTenantBySlug(tenantSlug, actorEmail);

  if (!tenant) {
    notFound();
  }

  const [members, domains] = await Promise.all([
    listTenantMembers(tenant.id, actorEmail),
    listTenantDomains(tenant.id, actorEmail),
  ]);

  return (
    <div className="stack">
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Tenant settings</h2>
        <p className="muted" style={{ margin: 0 }}>
          Manage tenant members/roles and domain routing from this page.
        </p>
      </section>
      <TenantSettingsPanel tenantId={tenant.id} members={members} domains={domains} />
    </div>
  );
}
