import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerActorEmail } from "@/lib/actor";
import { formatCurrency, formatMb } from "@/lib/format";
import { getDashboardStats, getTenantBySlug, listAlerts } from "@/lib/store";

interface TenantOverviewPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantOverviewPage({ params }: TenantOverviewPageProps) {
  const { tenantSlug } = await params;
  const actorEmail = getServerActorEmail();
  const tenant = await getTenantBySlug(tenantSlug, actorEmail);

  if (!tenant) {
    notFound();
  }

  const stats = await getDashboardStats(tenant.id, actorEmail);
  const alerts = (await listAlerts(tenant.id, actorEmail)).slice(0, 5);

  return (
    <div className="stack">
      <section className="grid cols-2">
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Employees</h3>
          <p style={{ fontSize: "1.8rem", margin: "0.4rem 0" }}>{stats.employees}</p>
          <Link href={`/t/${tenant.slug}/employees`}>Manage employees</Link>
        </article>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Active lines</h3>
          <p style={{ fontSize: "1.8rem", margin: "0.4rem 0" }}>{stats.activeLines}</p>
          <Link href={`/t/${tenant.slug}/lines`}>Manage lines</Link>
        </article>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Suspended lines</h3>
          <p style={{ fontSize: "1.8rem", margin: "0.4rem 0" }}>{stats.suspendedLines}</p>
          <p className="muted" style={{ margin: 0 }}>
            Use policy rules to suspend automatically when caps are exceeded.
          </p>
        </article>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Open alerts</h3>
          <p style={{ fontSize: "1.8rem", margin: "0.4rem 0" }}>{stats.openAlerts}</p>
          <Link href={`/t/${tenant.slug}/alerts`}>Review alerts</Link>
        </article>
      </section>

      <section className="grid cols-2">
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Current month usage</h3>
          <p style={{ fontSize: "1.8rem", margin: "0.4rem 0" }}>{formatMb(stats.monthlyUsageMb)}</p>
          <Link href={`/t/${tenant.slug}/usage`}>Open usage analytics</Link>
        </article>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Estimated monthly spend</h3>
          <p style={{ fontSize: "1.8rem", margin: "0.4rem 0" }}>
            {formatCurrency(stats.estimatedMonthlyCostUsd)}
          </p>
          <Link href={`/t/${tenant.slug}/spend`}>Open spend analytics</Link>
        </article>
      </section>

      <section className="card stack">
        <h3 style={{ margin: 0 }}>Recent alerts</h3>
        {alerts.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No alerts yet.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {alerts.map((alert) => (
              <li key={alert.id}>
                <span className={`badge ${alert.severity}`} style={{ marginRight: "0.4rem" }}>
                  {alert.severity}
                </span>
                {alert.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
