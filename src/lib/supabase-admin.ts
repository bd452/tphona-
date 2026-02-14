import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/app-error";

declare global {
  var __SUPABASE_ADMIN__: SupabaseClient | undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new AppError(
      500,
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  if (!globalThis.__SUPABASE_ADMIN__) {
    globalThis.__SUPABASE_ADMIN__ = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return globalThis.__SUPABASE_ADMIN__;
}
