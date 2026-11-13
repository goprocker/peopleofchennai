"use client";

import { ActionForm, AdminField } from "@/components/admin/action-form";
import { ConfirmButtonForm } from "@/components/admin/consent-forms";
import type { ActionResult } from "@/lib/errors";
import { IMAGE_TYPES } from "@/lib/validation/public-forms";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

export function UploadForm({ action }: { action: Action }) {
  return (
    <ActionForm action={action} submitLabel="Upload" pendingLabel="Uploading…" successMessage="Uploaded.">
      {({ fieldError }) => (
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <AdminField
            label="Image"
            name="file"
            type="file"
            accept={IMAGE_TYPES.join(",")}
            hint="JPEG, PNG or WebP, up to 5 MB, at least 400px. Location data is removed."
            required
            error={fieldError("file")}
          />
          <AdminField
            label="Alt text"
            name="altText"
            hint="Describe the image for people using screen readers."
            error={fieldError("altText")}
          />
        </div>
      )}
    </ActionForm>
  );
}

export function MediaItemForms({ alt, update, remove }: { alt: string; update: Action; remove: Action }) {
  return (
    <div className="space-y-2">
      <ActionForm action={update} submitLabel="Save alt" submitVariant="outline" className="space-y-2">
        {({ fieldError }) => (
          <AdminField label="Alt text" name="altText" defaultValue={alt} error={fieldError("altText")} />
        )}
      </ActionForm>
      <ConfirmButtonForm action={remove} label="Delete" variant="ghost" successMessage="Deleted." />
    </div>
  );
}
