"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Employee, Line, Plan } from "@/lib/types";

interface LinesPanelProps {
  tenantId: string;
  employees: Employee[];
  plans: Plan[];
  lines: Line[];
}

function statusClass(status: Line["status"]): string {
  switch (status) {
    case "active":
      return "badge active";
    case "suspended":
      return "badge suspended";
    case "terminated":
      return "badge terminated";
    default:
      return "badge";
  }
}

export function LinesPanel({ tenantId, employees, plans, lines }: LinesPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [busyLineId, setBusyLineId] = useState<string | null>(null);

  const employeeNameById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name])),
    [employees],
  );
  const planNameById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan.name])), [plans]);

  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");

  async function request(
    path: string,
    options: RequestInit = { method: "POST" },
    lineIdForBusy?: string,
  ): Promise<void> {
    if (lineIdForBusy) {
      setBusyLineId(lineIdForBusy);
    }
    setError(null);
    try {
      const response = await fetch(path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        },
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Request failed.");
      }
      router.refresh();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error.";
      setError(message);
    } finally {
      if (lineIdForBusy) {
        setBusyLineId(null);
      }
    }
  }

  async function handleProvision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employeeId || !planId) {
      setError("Choose an employee and plan.");
      return;
    }

    setIsProvisioning(true);
    setError(null);
    try {
      await request(`/api/tenants/${tenantId}/lines/provision`, {
        method: "POST",
        body: JSON.stringify({ employeeId, planId }),
      });
    } finally {
      setIsProvisioning(false);
    }
  }

  async function handleChangePlan(event: FormEvent<HTMLFormElement>, lineId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextPlanId = String(formData.get("planId") ?? "");
    if (!nextPlanId) {
      return;
    }

    await request(
      `/api/tenants/${tenantId}/lines/${lineId}/plan`,
      {
        method: "POST",
        body: JSON.stringify({ planId: nextPlanId }),
      },
      lineId,
    );
  }

  async function handleReallocate(event: FormEvent<HTMLFormElement>, lineId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const mb = Number(formData.get("dataAllocatedMb") ?? 0);
    if (!Number.isFinite(mb) || mb <= 0) {
      setError("Data allocation must be a positive number.");
      return;
    }

    await request(
      `/api/tenants/${tenantId}/lines/${lineId}/allocate`,
      {
        method: "POST",
        body: JSON.stringify({ dataAllocatedMb: mb }),
      },
      lineId,
    );
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h3 style={{ margin: 0 }}>Provision line</h3>
        <form className="row wrap" onSubmit={handleProvision}>
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} ({employee.team})
              </option>
            ))}
          </select>
          <select value={planId} onChange={(event) => setPlanId(event.target.value)} required>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - ${plan.monthlyPriceUsd}/mo
              </option>
            ))}
          </select>
          <button type="submit" disabled={isProvisioning || employees.length === 0 || plans.length === 0}>
            {isProvisioning ? "Provisioning..." : "Issue eSIM"}
          </button>
        </form>
        {error ? (
          <p className="muted" style={{ margin: 0, color: "#b91c1c" }}>
            {error}
          </p>
        ) : null}
      </section>

      <section className="card stack">
        <h3 style={{ margin: 0 }}>Managed lines</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Status</th>
              <th>Plan</th>
              <th>Allocation</th>
              <th>Provider line</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const lineBusy = busyLineId === line.id;
              return (
                <tr key={line.id}>
                  <td>{employeeNameById.get(line.employeeId) ?? "Unknown"}</td>
                  <td>
                    <span className={statusClass(line.status)}>{line.status}</span>
                  </td>
                  <td>{planNameById.get(line.planId) ?? line.planId}</td>
                  <td>{line.dataAllocatedMb.toLocaleString()} MB</td>
                  <td className="muted" style={{ fontSize: "0.8rem" }}>
                    {line.providerLineId}
                  </td>
                  <td>
                    <div className="stack">
                      <div className="row wrap">
                        {line.status !== "suspended" && line.status !== "terminated" ? (
                          <button
                            type="button"
                            className="warning"
                            disabled={lineBusy}
                            onClick={() =>
                              request(`/api/tenants/${tenantId}/lines/${line.id}/suspend`, { method: "POST" }, line.id)
                            }
                          >
                            Suspend
                          </button>
                        ) : null}

                        {line.status === "suspended" ? (
                          <button
                            type="button"
                            className="secondary"
                            disabled={lineBusy}
                            onClick={() =>
                              request(
                                `/api/tenants/${tenantId}/lines/${line.id}/reactivate`,
                                { method: "POST" },
                                line.id,
                              )
                            }
                          >
                            Reactivate
                          </button>
                        ) : null}

                        {line.status !== "terminated" ? (
                          <button
                            type="button"
                            className="danger"
                            disabled={lineBusy}
                            onClick={() =>
                              request(`/api/tenants/${tenantId}/lines/${line.id}/terminate`, { method: "POST" }, line.id)
                            }
                          >
                            Terminate
                          </button>
                        ) : null}
                      </div>

                      <form className="row wrap" onSubmit={(event) => handleChangePlan(event, line.id)}>
                        <select name="planId" defaultValue={line.planId} disabled={lineBusy}>
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="secondary" disabled={lineBusy}>
                          Change plan
                        </button>
                      </form>

                      <form className="row wrap" onSubmit={(event) => handleReallocate(event, line.id)}>
                        <input
                          type="number"
                          name="dataAllocatedMb"
                          min={256}
                          step={256}
                          defaultValue={line.dataAllocatedMb}
                          disabled={lineBusy}
                          required
                        />
                        <button type="submit" className="secondary" disabled={lineBusy}>
                          Reallocate data
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No lines provisioned yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
