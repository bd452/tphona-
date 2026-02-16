import { notFound } from "next/navigation";

import { getServerActorEmail } from "@/lib/actor-server";
import { formatCurrency } from "@/lib/format";
import { getSpendSummary, getTenantBySlug } from "@/lib/store";

interface SpendPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function SpendPage({ params }: SpendPageProps) {
  const { tenantSlug } = await params;
  const actorEmail = await getServerActorEmail();
  const tenant = await getTenantBySlug(tenantSlug, actorEmail);
  if (!tenant) {
    notFound();
  }

  const spend = await getSpendSummary(tenant.id, actorEmail);

  return (
    <div className="stack">
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Spend Analytics</h2>
        <p className="muted" style={{ margin: 0 }}>
          Month: {spend.month}
        </p>
        <div className="row wrap">
          <span className="badge">{`Base: ${formatCurrency(spend.totalBaseCostUsd)}`}</span>
          <span className="badge">{`Overage: ${formatCurrency(spend.totalOverageCostUsd)}`}</span>
          <span className="badge">{`Total: ${formatCurrency(spend.totalCostUsd)}`}</span>
        </div>
      </section>

      <section className="grid cols-2">
        <article className="card stack">
          <h3 style={{ margin: 0 }}>By team</h3>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {Object.entries(spend.byTeam).map(([team, amount]) => (
              <li key={team}>
                {team}: {formatCurrency(amount)}
              </li>
            ))}
            {Object.keys(spend.byTeam).length === 0 ? (
              <li className="muted">No spend data yet.</li>
            ) : null}
          </ul>
        </article>

        <article className="card stack">
          <h3 style={{ margin: 0 }}>By cost center</h3>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {Object.entries(spend.byCostCenter).map(([costCenter, amount]) => (
              <li key={costCenter}>
                {costCenter}: {formatCurrency(amount)}
              </li>
            ))}
            {Object.keys(spend.byCostCenter).length === 0 ? (
              <li className="muted">No spend data yet.</li>
            ) : null}
          </ul>
        </article>
      </section>

      <section className="card stack">
        <h3 style={{ margin: 0 }}>Line-level spend</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Team</th>
              <th>Cost center</th>
              <th>Base</th>
              <th>Overage</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {spend.lines.map((line) => (
              <tr key={line.lineId}>
                <td>{line.employeeName}</td>
                <td>{line.team}</td>
                <td>{line.costCenter}</td>
                <td>{formatCurrency(line.baseCostUsd)}</td>
                <td>{formatCurrency(line.overageCostUsd)}</td>
                <td>{formatCurrency(line.totalCostUsd)}</td>
              </tr>
            ))}
            {spend.lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No line spend yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
