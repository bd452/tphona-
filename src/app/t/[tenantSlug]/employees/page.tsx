import { notFound } from "next/navigation";

import { EmployeesPanel } from "@/components/employees-panel";
import { getServerActorEmail } from "@/lib/actor";
import { getTenantBySlug, listEmployees } from "@/lib/store";

interface EmployeesPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function EmployeesPage({ params }: EmployeesPageProps) {
  const { tenantSlug } = await params;
  const actorEmail = getServerActorEmail();
  const tenant = await getTenantBySlug(tenantSlug, actorEmail);
  if (!tenant) {
    notFound();
  }

  const employees = await listEmployees(tenant.id, actorEmail);

  return (
    <div className="stack">
      <section className="card">
        <h2 style={{ margin: 0 }}>Employees</h2>
        <p className="muted" style={{ margin: "0.3rem 0 0 0" }}>
          Import employees and set baseline monthly caps. This dataset powers allocation and cost
          attribution.
        </p>
      </section>
      <EmployeesPanel tenantId={tenant.id} employees={employees} />
    </div>
  );
}
