"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function NewTenantForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryDomain, setPrimaryDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          primaryDomain: primaryDomain || undefined,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        tenant?: { slug: string };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create tenant.");
      }

      const targetSlug = payload.tenant?.slug;
      if (targetSlug) {
        router.push(`/t/${targetSlug}`);
      } else {
        router.refresh();
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="row wrap">
        <input
          placeholder="Tenant name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <input
          placeholder="tenant-slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value.toLowerCase())}
          pattern="[a-z0-9-]+"
          required
        />
        <input
          placeholder="Optional domain (e.g. acme.example.com)"
          value={primaryDomain}
          onChange={(event) => setPrimaryDomain(event.target.value.toLowerCase())}
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create tenant"}
        </button>
      </div>
      {error ? (
        <p className="muted" style={{ margin: 0, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
