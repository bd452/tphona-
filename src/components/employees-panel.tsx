"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { Employee } from "@/lib/types";

interface EmployeesPanelProps {
  tenantId: string;
  employees: Employee[];
}

export function EmployeesPanel({ tenantId, employees }: EmployeesPanelProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [team, setTeam] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [monthlyDataCapMb, setMonthlyDataCapMb] = useState(8_192);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          team,
          costCenter,
          monthlyDataCapMb,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create employee.");
      }

      setName("");
      setEmail("");
      setTeam("");
      setCostCenter("");
      setMonthlyDataCapMb(8_192);
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h3 style={{ margin: 0 }}>Add employee</h3>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="row wrap">
            <input
              placeholder="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Work email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              placeholder="Team"
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              required
            />
            <input
              placeholder="Cost center"
              value={costCenter}
              onChange={(event) => setCostCenter(event.target.value)}
              required
            />
            <input
              type="number"
              min={512}
              step={256}
              placeholder="Data cap MB"
              value={monthlyDataCapMb}
              onChange={(event) => setMonthlyDataCapMb(Number(event.target.value))}
              required
            />
          </div>
          <div className="row">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add employee"}
            </button>
            {error ? (
              <span className="muted" style={{ color: "#b91c1c" }}>
                {error}
              </span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card stack">
        <h3 style={{ margin: 0 }}>Employee directory</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Team</th>
              <th>Cost center</th>
              <th>Data cap</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.name}</td>
                <td>{employee.email}</td>
                <td>{employee.team}</td>
                <td>{employee.costCenter}</td>
                <td>{employee.monthlyDataCapMb.toLocaleString()} MB</td>
              </tr>
            ))}
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No employees yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
