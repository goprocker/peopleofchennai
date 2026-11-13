"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { dbFail } from "@/lib/admin/db";
import { requirePermission } from "@/lib/auth/session";
import { siteUrl } from "@/lib/env";
import { AppError, runAction, type ActionResult } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { editorRoleSchema, settingsSchema } from "@/lib/validation/admin";

export async function saveSettings(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("settings.manage");
    const emails = String(form.get("editorNotificationEmails") ?? "")
      .split(/[\s,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const bad = emails.filter((e) => !z.email().safeParse(e).success);
    if (bad.length) {
      const msg = `Not a valid email: ${bad.join(", ")}`;
      throw new AppError("VALIDATION", msg, { editorNotificationEmails: [msg] });
    }
    const input = settingsSchema.parse({
      submissionsOpen: form.get("submissionsOpen") === "on",
      consentVersion: form.get("consentVersion"),
      editorNotificationEmails: emails,
    });
    const db = await createSupabaseServerClient();
    const now = new Date().toISOString();
    const { error } = await db.from("site_settings").upsert([
      { key: "submissions_open", value: input.submissionsOpen, updated_at: now, updated_by: session.userId },
      { key: "consent_version", value: input.consentVersion, updated_at: now, updated_by: session.userId },
      {
        key: "editor_notification_emails",
        value: input.editorNotificationEmails,
        updated_at: now,
        updated_by: session.userId,
      },
    ]);
    if (error) dbFail("save_settings", error);
    await audit(session, "settings.update", "settings", null, {
      submissionsOpen: input.submissionsOpen,
      consentVersion: input.consentVersion,
      notificationCount: input.editorNotificationEmails.length,
    });
    revalidatePath("/admin/settings");
    return undefined;
  });
}

/**
 * Grant a role to an email. Existing auth users get the role; new addresses are invited
 * by email (Supabase sends the invite). Uses the service role for the auth admin API.
 */
export async function grantEditorRole(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const session = await requirePermission("editors.manage");
    const input = editorRoleSchema.parse({
      email: String(form.get("email") ?? "")
        .trim()
        .toLowerCase(),
      role: form.get("role"),
    });
    const admin = createSupabaseAdminClient();

    let userId: string | undefined;
    let invited = false;
    const invite = await admin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/admin/reset-password`,
    });
    if (invite.data.user) {
      userId = invite.data.user.id;
      invited = true;
    } else {
      // Already registered: find the user. listUsers is paginated; editor teams are small.
      for (let page = 1; page <= 10 && !userId; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) dbFail("list_users", error);
        userId = data.users.find((u) => u.email?.toLowerCase() === input.email)?.id;
        if (data.users.length < 200) break;
      }
      if (!userId) {
        logger.warn("invite_failed", { message: invite.error?.message });
        throw new AppError("VALIDATION", "Couldn’t invite that address.", {
          email: ["Couldn’t invite that address."],
        });
      }
    }

    const db = await createSupabaseServerClient();
    const { error } = await db.from("editor_roles").upsert({ user_id: userId, role: input.role });
    if (error) dbFail("grant_role", error);
    await audit(session, "editor.grant", "editor", userId, { role: input.role, invited });
    revalidatePath("/admin/settings");
    return invited;
  });
  if (!result.ok) return result;
  return { ok: true, message: result.data ? "Invitation sent." : "Role updated." };
}

export async function revokeEditorRole(
  userId: string,
  _p: ActionResult | null,
  _f: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("editors.manage");
    const uid = z.uuid().parse(userId);
    if (uid === session.userId) throw new AppError("CONFLICT", "You can’t remove your own access.");
    const db = await createSupabaseServerClient();
    const { error } = await db.from("editor_roles").delete().eq("user_id", uid);
    if (error) dbFail("revoke_role", error);
    await audit(session, "editor.revoke", "editor", uid);
    revalidatePath("/admin/settings");
    return undefined;
  });
}
