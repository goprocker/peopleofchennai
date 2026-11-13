import "server-only";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** Map a PostgREST error to an AppError, keeping DB detail out of the response. */
export function dbFail(op: string, error: { message: string; code?: string }): never {
  if (error.code === "23505") throw new AppError("CONFLICT", "That slug is already in use.");
  if (error.message.includes("CONSENT_REQUIRED")) {
    throw new AppError("CONSENT_REQUIRED", "Record a granted publication consent before publishing.");
  }
  if (error.code === "42501") throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  logger.error("admin_db_error", { op, code: error.code, message: error.message });
  throw new AppError("INTERNAL", "That didn’t save. Please try again.");
}

export const ADMIN_PAGE_SIZE = 25;

export function pageRange(page: number, size = ADMIN_PAGE_SIZE): [number, number] {
  const from = (page - 1) * size;
  return [from, from + size - 1];
}

/** Escape user input for a PostgREST `ilike` filter inside `.or()`. */
export function ilikeTerm(q: string): string {
  return `%${q.replace(/[%_\\,()*]/g, " ").trim()}%`;
}
