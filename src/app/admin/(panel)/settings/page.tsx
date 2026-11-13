import { ConfirmButtonForm } from "@/components/admin/consent-forms";
import { AdminHeader, DataTable, Panel, Td } from "@/components/admin/ui";
import { dbFail } from "@/lib/admin/db";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EditorRole } from "@/types/domain";
import { grantEditorRole, revokeEditorRole, saveSettings } from "./actions";
import { GrantRoleForm, SettingsForm } from "./settings-forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requirePagePermission("settings.manage");
  const db = await createSupabaseServerClient();
  const [settingsRes, rolesRes] = await Promise.all([
    db.from("site_settings").select("key, value"),
    db.from("editor_roles").select("user_id, role, display_name, created_at").order("created_at"),
  ]);
  if (settingsRes.error) dbFail("load_settings", settingsRes.error);
  if (rolesRes.error) dbFail("load_roles", rolesRes.error);
  const settings = Object.fromEntries(settingsRes.data.map((r) => [r.key, r.value]));

  // Emails live in auth.users; super-admin-only page, so the service role lookup is acceptable here.
  const admin = createSupabaseAdminClient();
  const emails = new Map<string, string>();
  await Promise.all(
    rolesRes.data.map(async (r) => {
      const { data } = await admin.auth.admin.getUserById(r.user_id);
      if (data.user?.email) emails.set(r.user_id, data.user.email);
    }),
  );

  return (
    <>
      <AdminHeader title="Settings" description="Site-wide switches and who can use the editor desk." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Site">
          <SettingsForm
            action={saveSettings}
            values={{
              submissionsOpen: settings.submissions_open !== false,
              consentVersion: typeof settings.consent_version === "string" ? settings.consent_version : "",
              emails: Array.isArray(settings.editor_notification_emails)
                ? settings.editor_notification_emails
                : [],
            }}
          />
        </Panel>

        <Panel title="Editors">
          <DataTable head={["Person", "Role", ""]}>
            {rolesRes.data.map((r) => (
              <tr key={r.user_id}>
                <Td>
                  <span className="font-medium">
                    {r.display_name ?? emails.get(r.user_id) ?? "Unknown user"}
                  </span>
                  {r.display_name && <p className="text-muted text-xs">{emails.get(r.user_id)}</p>}
                </Td>
                <Td>{ROLE_LABELS[r.role as EditorRole]}</Td>
                <Td>
                  {r.user_id === session.userId ? (
                    <span className="text-muted text-xs">You</span>
                  ) : (
                    <ConfirmButtonForm
                      action={revokeEditorRole.bind(null, r.user_id)}
                      label="Remove"
                      variant="ghost"
                      successMessage="Access removed."
                    />
                  )}
                </Td>
              </tr>
            ))}
          </DataTable>
          <div className="border-border mt-6 border-t pt-5">
            <h3 className="mb-3 text-sm font-semibold">Give someone access</h3>
            <GrantRoleForm action={grantEditorRole} />
            <p className="text-muted mt-3 text-xs">
              Reviewers can read and annotate submissions. Editors can also edit, publish and record consent.
              Super Admins also manage settings, editors and the audit log.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
