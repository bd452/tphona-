import { notFound } from "next/navigation";

import { SyncUsageButton } from "@/components/sync-usage-button";
import { formatMb, formatPercent } from "@/lib/format";
import { getTenantBySlug, getUsageSummary } from "@/lib/store";

interface UsagePageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function UsagePage({ params }: UsagePageProps) {
  const { tenantSlug } = await params;
  const tenant = getTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const usage = getUsageSummary(tenant.id);

  return (
    <div className="stack">
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Usage Analytics</h2>
        <p className="muted" style={{ margin: 0 }}>
          Month: {usage.month} | Total usage: {formatMb(usage.totalUsedMb)}
        </p>
        <SyncUsageButton tenantId={tenant.id} />
      </section>

      <section className="card stack">
        <h3 style={{ margin: 0 }}>Usage by line</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Team</th>
              <th>Status</th>
              <th>Used</th>
              <th>Allocation</th>
              <th>Utilization</th>
            </tr>
          </thead>
          <tbody>
            {usage.lines.map((line) => (
              <tr key={line.lineId}>
                <td>{line.employeeName}</td>
                <td>{line.team}</td>
                <td>{line.status}</td>
                <td>{formatMb(line.usedMb)}</td>
                <td>{formatMb(line.allocatedMb)}</td>
                <td>{formatPercent(line.usagePct)}</td>
              </tr>
            ))}
            {usage.lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No usage data yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
