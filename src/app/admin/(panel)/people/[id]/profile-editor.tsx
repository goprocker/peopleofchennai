"use client";

import { useState } from "react";
import { ActionForm, AdminField } from "@/components/admin/action-form";
import type { ActionResult } from "@/lib/errors";
import { SOCIAL_PLATFORMS } from "@/lib/validation/admin";
import { slugify } from "@/lib/utils";

export interface ProfileFormValues {
  fullName: string;
  slug: string;
  headline: string;
  shortBio: string;
  longBio: string;
  pullQuote: string;
  sections: Record<string, string>;
  neighbourhoodId: string;
  portraitMediaId: string;
  featured: boolean;
  categoryIds: string[];
  galleryMediaIds: string[];
  links: { platform: string; url: string }[];
  interview: { question: string; answer: string }[];
}

export interface Option {
  id: string;
  label: string;
}
export interface MediaOption extends Option {
  url: string;
}

const SECTIONS: [name: string, label: string][] = [
  ["storyIntroduction", "Introduction"],
  ["storyBackground", "Background"],
  ["storyJourney", "The journey"],
  ["storyChallenges", "Challenges"],
  ["storyAchievements", "Achievements"],
  ["storyChennai", "Their Chennai"],
  ["storyAspirations", "What’s next"],
];

let rowSeq = 0;
const withKeys = <T,>(rows: T[]) => rows.map((r) => ({ ...r, key: ++rowSeq }));

export function ProfileEditor({
  action,
  values,
  categories,
  neighbourhoods,
  media,
  readOnly,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  values: ProfileFormValues;
  categories: Option[];
  neighbourhoods: Option[];
  media: MediaOption[];
  readOnly: boolean;
}) {
  const [links, setLinks] = useState(() => withKeys(values.links));
  const [interview, setInterview] = useState(() => withKeys(values.interview));
  const [slug, setSlug] = useState(values.slug);

  return (
    <ActionForm action={action} submitLabel="Save changes" successMessage="Profile saved.">
      {({ fieldError }) => (
        <fieldset disabled={readOnly} className="space-y-8">
          <Section title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField
                label="Full name"
                name="fullName"
                defaultValue={values.fullName}
                required
                error={fieldError("fullName")}
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
                    const name = (
                      e.currentTarget.form?.elements.namedItem("fullName") as HTMLInputElement | null
                    )?.value;
                    if (name) setSlug(slugify(name));
                  }}
                >
                  Generate from name
                </button>
              </div>
            </div>
            <AdminField
              label="Headline"
              name="headline"
              defaultValue={values.headline}
              hint="4–160 characters."
              required
              error={fieldError("headline")}
            />
            <AdminField
              as="textarea"
              rows={3}
              label="Short bio"
              name="shortBio"
              defaultValue={values.shortBio}
              hint="Shown on cards. Up to 600 characters."
              error={fieldError("shortBio")}
            />
            <AdminField
              label="Pull quote"
              name="pullQuote"
              defaultValue={values.pullQuote}
              error={fieldError("pullQuote")}
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="featured" defaultChecked={values.featured} className="size-4" />{" "}
              Feature on the home page
            </label>
          </Section>

          <Section title="Story">
            {SECTIONS.map(([name, label]) => (
              <AdminField
                key={name}
                as="textarea"
                rows={5}
                label={label}
                name={name}
                defaultValue={values.sections[name] ?? ""}
                error={fieldError(name)}
              />
            ))}
            <AdminField
              as="textarea"
              rows={6}
              label="Long bio (fallback when no sections)"
              name="longBio"
              defaultValue={values.longBio}
              error={fieldError("longBio")}
            />
          </Section>

          <Section title="Interview">
            {interview.map((qa, i) => (
              <div key={qa.key} className="border-border space-y-2 rounded-sm border p-3">
                <AdminField
                  label={`Question ${i + 1}`}
                  name="interviewQuestion"
                  defaultValue={qa.question}
                  error={fieldError(`interview.${i}.question`)}
                />
                <AdminField
                  as="textarea"
                  rows={3}
                  label="Answer"
                  name="interviewAnswer"
                  defaultValue={qa.answer}
                  error={fieldError(`interview.${i}.answer`)}
                />
                <button
                  type="button"
                  className="text-error text-xs underline"
                  onClick={() => setInterview((r) => r.filter((x) => x.key !== qa.key))}
                >
                  Remove question
                </button>
              </div>
            ))}
            {interview.length < 12 && (
              <button
                type="button"
                className="text-sm underline underline-offset-4"
                onClick={() => setInterview((r) => [...r, ...withKeys([{ question: "", answer: "" }])])}
              >
                + Add question
              </button>
            )}
          </Section>

          <Section title="Classification">
            <AdminField
              as="select"
              label="Neighbourhood"
              name="neighbourhoodId"
              defaultValue={values.neighbourhoodId}
              options={[
                { value: "", label: "—" },
                ...neighbourhoods.map((n) => ({ value: n.id, label: n.label })),
              ]}
              error={fieldError("neighbourhoodId")}
            />
            <fieldset>
              <legend className="text-sm font-semibold">Categories (up to 4)</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="categoryIds"
                      value={c.id}
                      defaultChecked={values.categoryIds.includes(c.id)}
                      className="size-4"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              {fieldError("categoryIds") && (
                <p className="text-error mt-1 text-sm">{fieldError("categoryIds")}</p>
              )}
            </fieldset>
          </Section>

          <Section title="Photos">
            {media.length === 0 ? (
              <p className="text-muted text-sm">
                Upload images in Media first; only public library images can be used on profiles.
              </p>
            ) : (
              <>
                <AdminField
                  as="select"
                  label="Portrait"
                  name="portraitMediaId"
                  defaultValue={values.portraitMediaId}
                  options={[
                    { value: "", label: "—" },
                    ...media.map((m) => ({ value: m.id, label: m.label })),
                  ]}
                  error={fieldError("portraitMediaId")}
                />
                <fieldset>
                  <legend className="text-sm font-semibold">Gallery (up to 12)</legend>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {media.map((m) => (
                      <label key={m.id} className="relative block cursor-pointer">
                        <input
                          type="checkbox"
                          name="galleryMediaIds"
                          value={m.id}
                          defaultChecked={values.galleryMediaIds.includes(m.id)}
                          className="peer absolute top-1 left-1 size-4"
                          aria-label={m.label}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.url}
                          alt=""
                          className="peer-checked:ring-accent aspect-square w-full rounded-sm object-cover peer-checked:ring-2"
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
          </Section>

          <Section title="Links">
            {links.map((l, i) => (
              <div key={l.key} className="grid items-end gap-2 sm:grid-cols-[160px_1fr_auto]">
                <AdminField
                  as="select"
                  label="Platform"
                  name="linkPlatform"
                  defaultValue={l.platform}
                  options={SOCIAL_PLATFORMS.map((p) => ({ value: p, label: p }))}
                />
                <AdminField
                  label="URL"
                  name="linkUrl"
                  type="url"
                  defaultValue={l.url}
                  error={fieldError(`links.${i}.url`)}
                />
                <button
                  type="button"
                  className="text-error mb-2 text-xs underline"
                  onClick={() => setLinks((r) => r.filter((x) => x.key !== l.key))}
                >
                  Remove
                </button>
              </div>
            ))}
            {links.length < 8 && (
              <button
                type="button"
                className="text-sm underline underline-offset-4"
                onClick={() => setLinks((r) => [...r, ...withKeys([{ platform: "website", url: "" }])])}
              >
                + Add link
              </button>
            )}
          </Section>
        </fieldset>
      )}
    </ActionForm>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border bg-surface space-y-4 rounded-md border p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
