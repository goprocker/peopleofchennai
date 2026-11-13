"use client";

import { useState } from "react";
import { ActionForm, AdminField } from "@/components/admin/action-form";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import type { ActionResult } from "@/lib/errors";
import { slugify } from "@/lib/utils";

export interface StoryFormValues {
  title: string;
  slug: string;
  excerpt: string;
  body: unknown;
  profileId: string;
  coverMediaId: string;
  featured: boolean;
}

export function StoryEditor({
  action,
  values,
  profiles,
  media,
  readOnly,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  values: StoryFormValues;
  profiles: { id: string; label: string }[];
  media: { id: string; label: string }[];
  readOnly: boolean;
}) {
  const [slug, setSlug] = useState(values.slug);
  return (
    <ActionForm action={action} submitLabel="Save story" successMessage="Story saved.">
      {({ fieldError }) => (
        <fieldset disabled={readOnly} className="border-border bg-surface space-y-5 rounded-md border p-5">
          <AdminField
            label="Title"
            name="title"
            defaultValue={values.title}
            required
            error={fieldError("title")}
          />
          <div>
            <AdminField
              label="URL slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              hint="Changing this breaks old links."
              required
              error={fieldError("slug")}
            />
            <button
              type="button"
              className="mt-1 text-xs underline underline-offset-4"
              onClick={(e) => {
                const t = (e.currentTarget.form?.elements.namedItem("title") as HTMLInputElement | null)
                  ?.value;
                if (t) setSlug(slugify(t));
              }}
            >
              Generate from title
            </button>
          </div>
          <AdminField
            as="textarea"
            rows={2}
            label="Excerpt"
            name="excerpt"
            defaultValue={values.excerpt}
            hint="Shown on cards and in search results. Up to 500 characters."
            error={fieldError("excerpt")}
          />
          <RichTextEditor name="body" label="Body" initial={values.body} />
          {fieldError("body") && <p className="text-error text-sm">{fieldError("body")}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField
              as="select"
              label="About (profile)"
              name="profileId"
              defaultValue={values.profileId}
              options={[
                { value: "", label: "— Not about one person —" },
                ...profiles.map((p) => ({ value: p.id, label: p.label })),
              ]}
              error={fieldError("profileId")}
            />
            <AdminField
              as="select"
              label="Cover image"
              name="coverMediaId"
              defaultValue={values.coverMediaId}
              options={[{ value: "", label: "—" }, ...media.map((m) => ({ value: m.id, label: m.label }))]}
              error={fieldError("coverMediaId")}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="featured" defaultChecked={values.featured} className="size-4" />{" "}
            Feature on the home page
          </label>
        </fieldset>
      )}
    </ActionForm>
  );
}
