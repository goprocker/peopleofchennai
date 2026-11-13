import "server-only";
import { isSupabaseConfigured, serverEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const RATE_LIMITS = {
  submission: { limit: 3, windowSeconds: 60 * 60 },
  nomination: { limit: 5, windowSeconds: 60 * 60 },
  contact: { limit: 5, windowSeconds: 60 * 60 },
  login: { limit: 10, windowSeconds: 15 * 60 },
  password_reset: { limit: 3, windowSeconds: 60 * 60 },
} as const;
export type RateLimitKind = keyof typeof RATE_LIMITS;

// In-process fallback for local development without Supabase (not shared across instances).
const memory = new Map<string, { windowStart: number; hits: number }>();

export function memoryRateCheck(
  bucket: string,
  limit: number,
  windowSeconds: number,
  now = Date.now(),
): boolean {
  const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
  const entry = memory.get(bucket);
  if (!entry || entry.windowStart !== windowStart) {
    memory.set(bucket, { windowStart, hits: 1 });
    return true;
  }
  entry.hits += 1;
  return entry.hits <= limit;
}

/** Throws RATE_LIMITED when the caller exceeded the fixed-window limit for this form. */
export async function enforceRateLimit(kind: RateLimitKind, identifier: string): Promise<void> {
  const { limit, windowSeconds } = RATE_LIMITS[kind];
  const bucket = `${kind}:${identifier}`;
  let allowed: boolean;
  if (isSupabaseConfigured && serverEnv().SUPABASE_SERVICE_ROLE_KEY) {
    const { data, error } = await createSupabaseAdminClient().rpc("check_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      // Fall back to the in-process limiter so a DB hiccup neither blocks people nor disables limiting.
      logger.error("rate_limit_error", { kind, message: error.message });
      allowed = memoryRateCheck(bucket, limit, windowSeconds);
    } else {
      allowed = data === true;
    }
  } else {
    allowed = memoryRateCheck(bucket, limit, windowSeconds);
  }
  if (!allowed) {
    logger.warn("rate_limited", { kind });
    throw new AppError("RATE_LIMITED", "Too many requests. Please try again later.");
  }
}
