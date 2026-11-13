import "server-only";
import { Resend } from "resend";
import { isSupabaseConfigured, serverEnv, siteUrl } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

interface Mail {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}

let resend: Resend | null = null;

/**
 * Sends via Resend when configured; otherwise a logged no-op. Never throws: an email
 * failure must not fail the submission that triggered it.
 */
export async function sendEmail(mail: Mail): Promise<boolean> {
  const { RESEND_API_KEY, EMAIL_FROM } = serverEnv();
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    logger.info("email_skipped_not_configured", { subject: mail.subject });
    return false;
  }
  try {
    resend ??= new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: EMAIL_FROM, ...mail });
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    logger.error("email_failed", {
      subject: mail.subject,
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** Recipients from the env var plus the list editable in admin Settings. */
async function editorRecipients(): Promise<string[]> {
  const fromEnv = (serverEnv().EDITOR_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let fromDb: string[] = [];
  if (isSupabaseConfigured && serverEnv().SUPABASE_SERVICE_ROLE_KEY) {
    const { data } = await createSupabaseAdminClient()
      .from("site_settings")
      .select("value")
      .eq("key", "editor_notification_emails")
      .maybeSingle();
    if (Array.isArray(data?.value))
      fromDb = data.value.filter((v: unknown): v is string => typeof v === "string");
  }
  return [...new Set([...fromEnv, ...fromDb].map((e) => e.toLowerCase()))];
}

export type InboundKind = "submission" | "nomination" | "contact";

/** Notify editors. Carries no submitter PII; details stay in the admin. */
export async function notifyEditors(kind: InboundKind) {
  const to = await editorRecipients();
  if (to.length === 0) return;
  await sendEmail({
    to,
    subject: `New ${kind} — People of Chennai`,
    text: `A new ${kind} has arrived.\n\nReview it in the admin: ${siteUrl}/admin\n`,
  });
}

const ACK_BODY: Record<InboundKind, string> = {
  submission:
    "Thank you for sharing your story with People of Chennai. Our editors read every submission. If we’d like to feature you, we’ll be in touch, and nothing is published without your explicit consent.",
  nomination:
    "Thank you for nominating someone to People of Chennai. If we take the story forward, we’ll contact them directly and publish only with their own consent.",
  contact:
    "Thanks for writing to People of Chennai. We’ve received your message and will reply as soon as we can.",
};

export async function sendAcknowledgement(to: string, name: string, kind: InboundKind) {
  await sendEmail({
    to,
    subject: "We received your message — People of Chennai",
    text: `Hi ${name},\n\n${ACK_BODY[kind]}\n\nWarmly,\nThe People of Chennai team\n${siteUrl}\n`,
  });
}
