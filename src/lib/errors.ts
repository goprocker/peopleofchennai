import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "BOT_DETECTED"
  | "CONSENT_REQUIRED"
  | "CONFLICT"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  BOT_DETECTED: 400,
  CONSENT_REQUIRED: 409,
  CONFLICT: 409,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
  get status() {
    return STATUS[this.code];
  }
}

export interface ErrorBody {
  error: { code: ErrorCode; message: string; fields?: Record<string, string[]> };
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      (fields[key] ??= []).push(issue.message);
    }
    return new AppError("VALIDATION", "Please check the highlighted fields.", fields);
  }
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("CONSENT_REQUIRED")) {
    return new AppError("CONSENT_REQUIRED", "Publication requires granted consent on record.");
  }
  if (message.includes("duplicate key")) return new AppError("CONFLICT", "That slug is already in use.");
  logger.error("unhandled_error", { message });
  return new AppError("INTERNAL", "Something went wrong. Please try again.");
}

export function errorResponse(err: unknown) {
  const e = toAppError(err);
  const body: ErrorBody = { error: { code: e.code, message: e.message, fields: e.fields } };
  return NextResponse.json(body, { status: e.status });
}

/** Result type for Server Actions (serialisable). */
export type ActionResult<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: ErrorBody["error"] };

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    // Next.js redirect()/notFound() throw special errors that must propagate.
    if (err && typeof err === "object" && "digest" in err) throw err;
    const e = toAppError(err);
    return { ok: false, error: { code: e.code, message: e.message, fields: e.fields } };
  }
}
