"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { siteUrl } from "@/lib/env";
import { runAction, type ActionResult, AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/services/rate-limit";
import { clientIpFromHeaders, hashIdentifier } from "@/lib/services/request-meta";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter your email address.")),
  password: z.string().min(1, "Enter your password.").max(200),
});

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter your email address.")),
});

const newPasswordSchema = z
  .object({
    password: z.string().min(12, "Use at least 12 characters.").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don’t match.", path: ["confirm"] });

async function ipHash() {
  return hashIdentifier(clientIpFromHeaders(await headers()));
}

/** Only allow redirects back into the admin. */
function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/admin") && !n.startsWith("//") ? n : "/admin";
}

export async function signIn(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const input = loginSchema.parse({ email: form.get("email"), password: form.get("password") });
    await enforceRateLimit("login", await ipHash());
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(input);
    if (error || !data.user) {
      logger.warn("login_failed");
      // One message for every failure so we don't reveal which accounts exist.
      throw new AppError("UNAUTHENTICATED", "That email and password don’t match an editor account.");
    }
    const { data: role } = await supabase
      .from("editor_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!role) {
      await supabase.auth.signOut();
      throw new AppError("UNAUTHENTICATED", "That email and password don’t match an editor account.");
    }
    logger.info("login_ok", { userId: data.user.id });
  });
  if (!result.ok) return result;
  redirect(safeNext(form.get("next")));
}

export async function requestPasswordReset(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { email } = emailSchema.parse({ email: form.get("email") });
    await enforceRateLimit("password_reset", await ipHash());
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/admin/reset-password`,
    });
    if (error) logger.warn("password_reset_request_failed", { message: error.message });
    // Always the same response, whether or not the account exists.
  });
}

export async function updatePassword(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const input = newPasswordSchema.parse({ password: form.get("password"), confirm: form.get("confirm") });
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new AppError("UNAUTHENTICATED", "This reset link has expired. Request a new one.");
    const { error } = await supabase.auth.updateUser({ password: input.password });
    if (error) throw new AppError("VALIDATION", error.message, { password: [error.message] });
    logger.info("password_updated", { userId: data.user.id });
  });
  if (!result.ok) return result;
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
