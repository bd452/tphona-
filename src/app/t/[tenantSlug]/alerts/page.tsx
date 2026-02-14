import { notFound } from "next/navigation";

import { getServerActorEmail } from "@/lib/actor-server";
import { getTenantBySlug, listAlerts } from "@/lib/store";

interface AlertsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

function severityClass(severity: "info" | "warning" | "critical"): string {
  return `badge ${severity}`;
}

export default async function AlertsPage({ params }: AlertsPageProps) {
  const { tenantSlug } = await params;
  const actorEmail = await getServerActorEmail();
  const tenant = await getTenantBySlug(tenantSlug, actorEmail);
  if (!tenant) {
    notFound();
  }

  const alerts = await listAlerts(tenant.id, actorEmail);

  return (
    <div className="stack">
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Alerts and policy events</h2>
        <p className="muted" style={{ margin: 0 }}>
          Alerts are generated from usage-policy evaluations and provider lifecycle webhooks.
        </p>
      </section>

      <section className="card stack">
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Status</th>
              <th>Message</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id}>
                <td>
                  <span className={severityClass(alert.severity)}>{alert.severity}</span>
                </td>
                <td>{alert.status}</td>
                <td>{alert.message}</td>
                <td className="muted">{new Date(alert.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No alerts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
