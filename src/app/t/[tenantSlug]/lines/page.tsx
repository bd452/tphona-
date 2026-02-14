import { notFound } from "next/navigation";

import { LinesPanel } from "@/components/lines-panel";
import { getServerActorEmail } from "@/lib/actor";
import { getTenantBySlug, listEmployees, listLines, listPlans } from "@/lib/store";

interface LinesPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LinesPage({ params }: LinesPageProps) {
  const { tenantSlug } = await params;
  const actorEmail = getServerActorEmail();
  const tenant = await getTenantBySlug(tenantSlug, actorEmail);
  if (!tenant) {
    notFound();
  }

  const [employees, plans, lines] = await Promise.all([
    listEmployees(tenant.id, actorEmail),
    listPlans(tenant.id, actorEmail),
    listLines(tenant.id, actorEmail),
  ]);

  return (
    <div className="stack">
      <section className="card">
        <h2 style={{ margin: 0 }}>Lines and Allocation</h2>
        <p className="muted" style={{ margin: "0.3rem 0 0 0" }}>
          Dynamically provision eSIMs, adjust plans, reallocate data budgets, and suspend/reactivate
          service in one place.
        </p>
      </section>
      <LinesPanel tenantId={tenant.id} employees={employees} plans={plans} lines={lines} />
    </div>
  );
}
