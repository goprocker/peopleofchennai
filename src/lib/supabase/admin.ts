import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";

let client: SupabaseClient | null = null;

/**
 * Service-role client. BYPASSES RLS — only call after server-side validation and
 * authorization. Never import from client components (guarded by `server-only`).
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = serverEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AppError("SERVICE_UNAVAILABLE", "Supabase service role is not configured.");
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
