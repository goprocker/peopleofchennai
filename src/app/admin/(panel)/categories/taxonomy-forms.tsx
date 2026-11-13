"use client";

import { ActionForm, AdminField } from "@/components/admin/action-form";
import type { ActionResult } from "@/lib/errors";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

export function CategoryForm({
  action,
  values,
  isNew,
}: {
  action: Action;
  values?: { name: string; slug: string; description: string | null; displayOrder: number; active: boolean };
  isNew?: boolean;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={isNew ? "Add category" : "Save"}
      successMessage={isNew ? "Category added." : "Saved."}
    >
      {({ fieldError }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_100px]">
            <AdminField
              label="Name"
              name="name"
              defaultValue={values?.name}
              required
              error={fieldError("name")}
            />
            <AdminField
              label="Slug"
              name="slug"
              defaultValue={values?.slug}
              hint={isNew ? "Leave blank to generate." : undefined}
              error={fieldError("slug")}
            />
            <AdminField
              label="Order"
              name="displayOrder"
              type="number"
              min={0}
              max={999}
              defaultValue={values?.displayOrder ?? 0}
              error={fieldError("displayOrder")}
            />
          </div>
          <AdminField
            as="textarea"
            rows={2}
            label="Description"
            name="description"
            defaultValue={values?.description ?? ""}
            error={fieldError("description")}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={values?.active ?? true} className="size-4" />{" "}
            Active (visible on the site)
          </label>
        </>
      )}
    </ActionForm>
  );
}

export function NeighbourhoodForm({
  action,
  values,
  isNew,
}: {
  action: Action;
  values?: { name: string; slug: string; active: boolean };
  isNew?: boolean;
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={isNew ? "Add neighbourhood" : "Save"}
      successMessage={isNew ? "Neighbourhood added." : "Saved."}
      className="space-y-3"
    >
      {({ fieldError }) => (
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <AdminField
            label="Name"
            name="name"
            defaultValue={values?.name}
            required
            error={fieldError("name")}
          />
          <AdminField label="Slug" name="slug" defaultValue={values?.slug} error={fieldError("slug")} />
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={values?.active ?? true} className="size-4" />{" "}
            Active
          </label>
        </div>
      )}
    </ActionForm>
  );
}
