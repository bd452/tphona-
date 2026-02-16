import type { User } from "@supabase/supabase-js";

import { createServerSupabaseAuthClient } from "@/lib/supabase-auth-server";

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createServerSupabaseAuthClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user ?? null;
}

export async function getSessionUserEmail(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.email?.toLowerCase() ?? null;
}
