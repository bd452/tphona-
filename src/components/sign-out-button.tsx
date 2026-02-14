"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseAuthClient } from "@/lib/supabase-auth";

export function SignOutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseAuthClient(), []);
  const [isLoading, setIsLoading] = useState(false);

  async function signOut() {
    setIsLoading(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" className="secondary" onClick={signOut} disabled={isLoading}>
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}
