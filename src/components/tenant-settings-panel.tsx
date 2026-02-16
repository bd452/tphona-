"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { Role, TenantDomain, TenantMember } from "@/lib/types";

interface TenantSettingsPanelProps {
  tenantId: string;
  members: TenantMember[];
  domains: TenantDomain[];
}

const ROLE_OPTIONS: Role[] = ["owner", "admin", "finance", "manager", "viewer"];

export function TenantSettingsPanel({ tenantId, members, domains }: TenantSettingsPanelProps) {
  const router = useRouter();

  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<Role>("viewer");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSaving, setMemberSaving] = useState(false);

  const [domainHost, setDomainHost] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainSaving, setDomainSaving] = useState(false);

  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMemberError(null);
    setMemberSaving(true);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: memberEmail,
          role: memberRole,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add or update member.");
      }

      setMemberEmail("");
      setMemberRole("viewer");
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error.";
      setMemberError(message);
    } finally {
      setMemberSaving(false);
    }
  }

  async function handleDomainSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDomainError(null);
    setDomainSaving(true);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: domainHost,
          isPrimary,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add domain.");
      }

      setDomainHost("");
      setIsPrimary(false);
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error.";
      setDomainError(message);
    } finally {
      setDomainSaving(false);
    }
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h3 style={{ margin: 0 }}>Members and roles</h3>
        <form className="row wrap" onSubmit={handleMemberSubmit}>
          <input
            type="email"
            value={memberEmail}
            onChange={(event) => setMemberEmail(event.target.value)}
            placeholder="teammate@company.com"
            required
          />
          <select value={memberRole} onChange={(event) => setMemberRole(event.target.value as Role)}>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button type="submit" disabled={memberSaving}>
            {memberSaving ? "Saving..." : "Add / update member"}
          </button>
        </form>
        {memberError ? (
          <p className="muted" style={{ margin: 0, color: "#b91c1c" }}>
            {memberError}
          </p>
        ) : null}

        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.userEmail}</td>
                <td>{member.role}</td>
                <td className="muted">{new Date(member.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {members.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  No members found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="card stack">
        <h3 style={{ margin: 0 }}>Tenant domains</h3>
        <form className="stack" onSubmit={handleDomainSubmit}>
          <div className="row wrap">
            <input
              value={domainHost}
              onChange={(event) => setDomainHost(event.target.value.toLowerCase())}
              placeholder="acme.example.com"
              required
            />
            <label className="row" style={{ gap: "0.35rem" }}>
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(event) => setIsPrimary(event.target.checked)}
              />
              Set as primary
            </label>
            <button type="submit" disabled={domainSaving}>
              {domainSaving ? "Saving..." : "Add domain"}
            </button>
          </div>
        </form>
        {domainError ? (
          <p className="muted" style={{ margin: 0, color: "#b91c1c" }}>
            {domainError}
          </p>
        ) : null}

        <table>
          <thead>
            <tr>
              <th>Host</th>
              <th>Primary</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((domain) => (
              <tr key={domain.id}>
                <td>{domain.host}</td>
                <td>{domain.isPrimary ? <span className="badge info">primary</span> : "-"}</td>
                <td className="muted">{new Date(domain.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {domains.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  No domains configured yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
