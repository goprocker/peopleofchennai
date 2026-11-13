import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "@/lib/env";

/** Best-effort client IP from proxy headers (Vercel / Cloudflare / generic). */
export function clientIp(req: Request): string {
  return clientIpFromHeaders(req.headers);
}

/** Same as clientIp, for Server Actions (pass `await headers()`). */
export function clientIpFromHeaders(h: Headers): string {
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Salted one-way hash so raw IPs are never stored. */
export function hashIdentifier(value: string): string {
  const salt = serverEnv().RATE_LIMIT_SALT ?? "poc-dev-salt";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}
