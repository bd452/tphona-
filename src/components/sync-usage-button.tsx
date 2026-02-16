"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SyncUsageButtonProps {
  tenantId: string;
}

export function SyncUsageButton({ tenantId }: SyncUsageButtonProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/usage?sync=true`);
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to sync usage.");
      }
      router.refresh();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Unknown error.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="row wrap">
      <button type="button" onClick={handleClick} disabled={isSyncing}>
        {isSyncing ? "Syncing usage..." : "Sync usage now"}
      </button>
      {error ? (
        <span className="muted" style={{ color: "#b91c1c" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
