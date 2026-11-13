import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";

function requireConfig() {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new AppError("SERVICE_UNAVAILABLE", "Supabase is not configured.");
  return { url, key };
}

/** Session-aware client (respects RLS as the signed-in user). Use in admin pages/actions. */
export async function createSupabaseServerClient() {
  const { url, key } = requireConfig();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — the proxy refreshes sessions instead.
        }
      },
    },
  });
}

/**
 * Cookie-less anonymous client for public reads. RLS restricts it to published content,
 * and because it touches no request data the pages that use it stay statically cacheable.
 */
export function createSupabasePublicClient() {
  const { url, key } = requireConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
