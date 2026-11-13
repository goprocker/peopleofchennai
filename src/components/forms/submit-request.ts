import type { ErrorBody } from "@/lib/errors";

export type SubmitResult =
  | { ok: true }
  | { ok: false; message: string; fields?: Record<string, string[]> };

/**
 * POST a public form to its route handler. `body` is JSON unless it's FormData (multipart,
 * used when a photo is attached). Maps the server's ErrorBody into a simple result.
 */
export async function submitPublicForm(url: string, body: unknown): Promise<SubmitResult> {
  try {
    const isMultipart = body instanceof FormData;
    const res = await fetch(url, {
      method: "POST",
      headers: isMultipart ? undefined : { "Content-Type": "application/json" },
      body: isMultipart ? body : JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as ErrorBody | null;
    if (res.status === 429) {
      return { ok: false, message: "You’ve sent a few of these already. Please wait a little and try again." };
    }
    return {
      ok: false,
      message: data?.error.message ?? "Something went wrong. Please try again.",
      fields: data?.error.fields,
    };
  } catch {
    return { ok: false, message: "We couldn’t reach the server. Check your connection and try again." };
  }
}

/** Timestamp for the server's time-to-submit bot check. Called from effects/handlers, never during render. */
export const formStartTime = () => Date.now();
