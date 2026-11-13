"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Plus, X } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import {
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  clientImageCheck,
  submissionSchema,
} from "@/lib/validation/public-forms";
import { CheckboxField, FormAlert, Honeypot, SelectField, TextAreaField, TextField } from "./fields";
import { formStartTime, submitPublicForm } from "./submit-request";

type In = z.input<typeof submissionSchema>;
type Out = z.output<typeof submissionSchema>;
type Option = { value: string; label: string };

export function SubmissionForm({ categories, neighbourhoods }: { categories: Option[]; neighbourhoods: Option[] }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string>();
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(submissionSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      email: "",
      categorySlug: "",
      neighbourhoodSlug: "",
      introduction: "",
      story: "",
      whyItMatters: "",
      socialLinks: [],
      website_hp: "",
      startedAt: 1,
    } as unknown as In,
  });
  const links = useFieldArray({ control, name: "socialLinks" });

  // Time-to-submit check: the server rejects forms submitted implausibly fast.
  useEffect(() => setValue("startedAt", formStartTime()), [setValue]);

  const onSubmit = async (values: Out) => {
    setStatus(null);
    if (photoError) return;
    const body = new FormData();
    body.set("payload", JSON.stringify(values));
    if (photo) body.set("photo", photo);
    const result = await submitPublicForm("/api/submissions", body);
    if (result.ok) {
      reset();
      setPhoto(null);
      setValue("startedAt", formStartTime());
      setStatus({
        tone: "success",
        message: "Thank you — your story is with our editors. We’ll email you before anything is published.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    Object.entries(result.fields ?? {}).forEach(([key, msgs]) =>
      setError(key as Path<In>, { message: msgs[0] }),
    );
    setStatus({ tone: "error", message: result.message });
  };

  const story = useWatch({ control, name: "story" }) ?? "";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-8">
      {status && <FormAlert tone={status.tone}>{status.message}</FormAlert>}
      <Honeypot {...register("website_hp")} />

      <fieldset className="space-y-6">
        <legend className="eyebrow mb-2 text-accent">About you</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField label="Your name" required autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
          <TextField
            label="Email"
            type="email"
            required
            autoComplete="email"
            hint="Only our editors see this."
            error={errors.email?.message}
            {...register("email")}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField label="What best describes you?" placeholder="Choose one" options={categories} error={errors.categorySlug?.message} {...register("categorySlug")} />
          <SelectField label="Neighbourhood" placeholder="Choose one" options={neighbourhoods} error={errors.neighbourhoodSlug?.message} {...register("neighbourhoodSlug")} />
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="eyebrow mb-2 text-accent">Your story</legend>
        <TextAreaField
          label="Introduce yourself in a few lines"
          required
          rows={3}
          maxLength={600}
          error={errors.introduction?.message}
          {...register("introduction")}
        />
        <TextAreaField
          label="Tell us your story"
          required
          rows={10}
          maxLength={10000}
          count={story.length}
          hint="Where you started, what you do now, what Chennai means to you. Write it the way you’d say it."
          error={errors.story?.message}
          {...register("story")}
        />
        <TextAreaField
          label="Why should others hear it?"
          rows={3}
          maxLength={2000}
          error={errors.whyItMatters?.message}
          {...register("whyItMatters")}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="eyebrow mb-2 text-accent">Photo and links</legend>
        <div>
          <label htmlFor="submission-photo" className="block font-semibold">
            A photo of you <span className="ml-2 text-sm font-normal text-muted">(optional)</span>
          </label>
          <p id="submission-photo-hint" className="mt-1 text-sm text-muted">
            JPEG, PNG or WebP, up to {IMAGE_MAX_BYTES / 1024 / 1024} MB, at least 400px on each side. It stays private
            until you approve publication.
          </p>
          <input
            id="submission-photo"
            type="file"
            accept={IMAGE_TYPES.join(",")}
            aria-describedby={photoError ? "submission-photo-hint submission-photo-error" : "submission-photo-hint"}
            aria-invalid={Boolean(photoError)}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setPhoto(file);
              setPhotoError(file ? (clientImageCheck(file) ?? undefined) : undefined);
            }}
            className="mt-2 block w-full text-sm file:mr-4 file:min-h-11 file:rounded-full file:border-0 file:bg-surface-sunk file:px-5 file:font-semibold hover:file:bg-border"
          />
          {photoError && (
            <p id="submission-photo-error" className="mt-2 text-sm font-medium text-error">{photoError}</p>
          )}
        </div>

        <div className="space-y-3">
          <p className="font-semibold">
            Links <span className="ml-2 text-sm font-normal text-muted">(optional, up to 5)</span>
          </p>
          {links.fields.map((f, i) => (
            <div key={f.id} className="flex items-start gap-2">
              <TextField
                label={`Link ${i + 1}`}
                className="flex-1 [&>label]:sr-only"
                type="url"
                inputMode="url"
                placeholder="https://"
                required
                error={errors.socialLinks?.[i]?.url?.message}
                {...register(`socialLinks.${i}.url`)}
              />
              <button
                type="button"
                onClick={() => links.remove(i)}
                aria-label={`Remove link ${i + 1}`}
                className="mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-sunk"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          ))}
          {links.fields.length < 5 && (
            <button type="button" onClick={() => links.append({ url: "" })} className={buttonStyles({ variant: "ghost", className: "-ml-3" })}>
              <Plus aria-hidden className="size-4" /> Add a link
            </button>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-sm bg-surface-sunk p-6">
        <legend className="sr-only">Consent</legend>
        <CheckboxField
          label="I agree that People of Chennai may edit and publish my story and photo. I understand nothing goes live until an editor confirms the final version with me, and that I can withdraw consent at any time."
          error={errors.publicationConsent?.message}
          {...register("publicationConsent")}
        />
        <CheckboxField
          label={
            <>
              I’ve read the{" "}
              <Link href="/privacy" target="_blank" className="underline underline-offset-4">privacy notice</Link>.
            </>
          }
          error={errors.privacyAcknowledged?.message}
          {...register("privacyAcknowledged")}
        />
      </fieldset>

      <button type="submit" disabled={isSubmitting} className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}>
        {isSubmitting ? "Sending…" : "Send my story"}
      </button>
    </form>
  );
}
