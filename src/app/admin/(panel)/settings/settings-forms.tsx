"use client";

import { ActionForm, AdminField } from "@/components/admin/action-form";
import type { ActionResult } from "@/lib/errors";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

export function SettingsForm({
  action,
  values,
}: {
  action: Action;
  values: { submissionsOpen: boolean; consentVersion: string; emails: string[] };
}) {
  return (
    <ActionForm action={action} submitLabel="Save settings" successMessage="Settings saved.">
      {({ fieldError }) => (
        <>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="submissionsOpen"
              defaultChecked={values.submissionsOpen}
              className="size-4"
            />
            Accept new submissions and nominations
          </label>
          <AdminField
            label="Consent version"
            name="consentVersion"
            defaultValue={values.consentVersion}
            hint="Stamped on every new consent record. Change it when the consent wording changes."
            required
            error={fieldError("consentVersion")}
          />
          <AdminField
            as="textarea"
            rows={3}
            label="Notification emails"
            name="editorNotificationEmails"
            defaultValue={values.emails.join("\n")}
            hint="One per line. These addresses are told when something new arrives."
            error={fieldError("editorNotificationEmails")}
          />
        </>
      )}
    </ActionForm>
  );
}

export function GrantRoleForm({ action }: { action: Action }) {
  return (
    <ActionForm action={action} submitLabel="Grant access" pendingLabel="Sending…">
      {({ fieldError }) => (
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <AdminField label="Email" name="email" type="email" required error={fieldError("email")} />
          <AdminField
            as="select"
            label="Role"
            name="role"
            defaultValue="reviewer"
            options={[
              { value: "reviewer", label: "Reviewer" },
              { value: "editor", label: "Editor" },
              { value: "super_admin", label: "Super Admin" },
            ]}
            error={fieldError("role")}
          />
        </div>
      )}
    </ActionForm>
  );
}
