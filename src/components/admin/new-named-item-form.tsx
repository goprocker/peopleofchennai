"use client";

import type { ActionResult } from "@/lib/errors";
import { ActionForm, AdminField } from "./action-form";

export function NewNamedItemForm({
  action,
  name,
  label,
  submitLabel,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  name: string;
  label: string;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} pendingLabel="Creating…">
      {({ fieldError }) => (
        <AdminField label={label} name={name} required error={fieldError(name) ?? fieldError("_")} />
      )}
    </ActionForm>
  );
}
