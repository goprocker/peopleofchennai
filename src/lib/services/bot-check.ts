import "server-only";
import { serverEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** Forms submitted faster than this are almost certainly automated. */
export const MIN_FILL_MS = 3_000;
/** Reject stale/forged timestamps (form open longer than a day, or in the future). */
const MAX_FILL_MS = 24 * 60 * 60 * 1000;

interface BotFields {
  website_hp?: string;
  startedAt: number;
  turnstileToken?: string;
}

export function checkTiming(startedAt: number, now = Date.now()): boolean {
  const elapsed = now - startedAt;
  return elapsed >= MIN_FILL_MS && elapsed <= MAX_FILL_MS;
}

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = serverEnv().TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Turnstile is optional; enforced only when configured.
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5_000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    logger.error("turnstile_error", { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/**
 * Honeypot + time-to-submit + optional Turnstile. One generic message so bots learn
 * nothing about which check failed.
 */
export async function assertHuman(fields: BotFields, ip: string): Promise<void> {
  const reasons: string[] = [];
  if (fields.website_hp) reasons.push("honeypot");
  if (!checkTiming(fields.startedAt)) reasons.push("timing");
  if (reasons.length === 0 && !(await verifyTurnstile(fields.turnstileToken, ip))) reasons.push("turnstile");
  if (reasons.length) {
    logger.warn("bot_detected", { reasons });
    throw new AppError(
      "BOT_DETECTED",
      "We couldn’t verify this submission. Please wait a moment and try again.",
    );
  }
}
