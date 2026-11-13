import { z } from "zod";

/**
 * Environment validation. Public vars are safe for the browser; server vars are read
 * only through `serverEnv()` which must never be imported from client components.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EDITOR_NOTIFICATION_EMAILS: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  RATE_LIMIT_SALT: z.string().optional(),
});

const blankToUndefined = (obj: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === "" ? undefined : v]));

export const publicEnv = publicSchema.parse(
  blankToUndefined({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  }),
);

let cachedServer: z.infer<typeof serverSchema> | null = null;
export function serverEnv() {
  if (typeof window !== "undefined") throw new Error("serverEnv() called in the browser");
  cachedServer ??= serverSchema.parse(blankToUndefined({ ...process.env }));
  return cachedServer;
}

export const isSupabaseConfigured = Boolean(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
