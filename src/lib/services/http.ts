import "server-only";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { siteUrl } from "@/lib/env";

export const JSON_MAX_BYTES = 64 * 1024;
export const MULTIPART_MAX_BYTES = 6 * 1024 * 1024;

function assertSize(req: Request, max: number) {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > max) throw new AppError("VALIDATION", "That request is too large.");
}

/**
 * Light CSRF defence for cookie-less public POSTs: when the browser sends an Origin,
 * it must be ours. Requests without Origin (curl, server-to-server) are allowed through
 * to the bot and rate-limit checks.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const allowed = new Set([new URL(siteUrl).origin, new URL(req.url).origin]);
  if (!allowed.has(origin)) throw new AppError("FORBIDDEN", "Cross-site requests are not allowed.");
}

export async function readJson(req: Request): Promise<unknown> {
  assertSize(req, JSON_MAX_BYTES);
  if (!req.headers.get("content-type")?.includes("application/json")) {
    throw new AppError("VALIDATION", "Expected a JSON body.");
  }
  const text = await req.text();
  if (text.length > JSON_MAX_BYTES) throw new AppError("VALIDATION", "That request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("VALIDATION", "Malformed JSON body.");
  }
}

export async function readMultipart(req: Request): Promise<FormData> {
  assertSize(req, MULTIPART_MAX_BYTES);
  if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
    throw new AppError("VALIDATION", "Expected a multipart form body.");
  }
  try {
    return await req.formData();
  } catch {
    throw new AppError("VALIDATION", "Malformed form body.");
  }
}

export const created = () =>
  NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
