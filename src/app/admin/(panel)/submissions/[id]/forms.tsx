"use client";

import { ActionForm, AdminField } from "@/components/admin/action-form";
import type { ActionResult } from "@/lib/errors";
import { REVIEW_STATUSES } from "@/lib/validation/admin";
import { humanize } from "@/lib/admin/format";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

export function StatusForm({ action, current }: { action: Action; current: string }) {
  return (
    <ActionForm action={action} submitLabel="Update status" successMessage="Status updated.">
      {({ fieldError }) => (
        <AdminField
          as="select"
          label="Review status"
          name="reviewStatus"
          defaultValue={current}
          options={REVIEW_STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
          error={fieldError("reviewStatus")}
        />
      )}
    </ActionForm>
  );
}

export function NoteForm({ action }: { action: Action }) {
  return (
    <ActionForm action={action} submitLabel="Add note" successMessage="Note added.">
      {({ fieldError }) => (
        <AdminField
          as="textarea"
          rows={3}
          label="Editorial note"
          name="note"
          required
          error={fieldError("note")}
        />
      )}
    </ActionForm>
  );
}
