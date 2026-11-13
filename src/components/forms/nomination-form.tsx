"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { buttonStyles } from "@/components/ui/button";
import { nominationSchema } from "@/lib/validation/public-forms";
import { CheckboxField, FormAlert, Honeypot, SelectField, TextAreaField, TextField } from "./fields";
import { formStartTime, submitPublicForm } from "./submit-request";

type In = z.input<typeof nominationSchema>;
type Out = z.output<typeof nominationSchema>;
type Option = { value: string; label: string };

export function NominationForm({ categories, neighbourhoods }: { categories: Option[]; neighbourhoods: Option[] }) {
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(nominationSchema),
    mode: "onTouched",
    defaultValues: {
      nominatorName: "",
      nominatorEmail: "",
      nomineeName: "",
      reason: "",
      nomineeContact: "",
      categorySlug: "",
      neighbourhoodSlug: "",
      website_hp: "",
      startedAt: 1,
    } as unknown as In,
  });
  useEffect(() => setValue("startedAt", formStartTime()), [setValue]);
  const reason = useWatch({ control, name: "reason" }) ?? "";

  const onSubmit = async (values: Out) => {
    setStatus(null);
    const result = await submitPublicForm("/api/nominations", values);
    if (result.ok) {
      reset();
      setValue("startedAt", formStartTime());
      setStatus({
        tone: "success",
        message: "Thank you for the nomination. If we reach out to them, we’ll always ask for their consent first.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    Object.entries(result.fields ?? {}).forEach(([key, msgs]) => setError(key as Path<In>, { message: msgs[0] }));
    setStatus({ tone: "error", message: result.message });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-8">
      {status && <FormAlert tone={status.tone}>{status.message}</FormAlert>}
      <Honeypot {...register("website_hp")} />

      <fieldset className="space-y-6">
        <legend className="eyebrow mb-2 text-accent">Who should we meet?</legend>
        <TextField label="Their name" required error={errors.nomineeName?.message} {...register("nomineeName")} />
        <TextAreaField
          label="Why are they worth meeting?"
          required
          rows={6}
          maxLength={4000}
          count={reason.length}
          error={errors.reason?.message}
          {...register("reason")}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField label="Category" placeholder="Choose one" options={categories} error={errors.categorySlug?.message} {...register("categorySlug")} />
          <SelectField label="Neighbourhood" placeholder="Choose one" options={neighbourhoods} error={errors.neighbourhoodSlug?.message} {...register("neighbourhoodSlug")} />
        </div>
        <TextField
          label="How can we reach them?"
          hint="A shop address, public page or social handle is fine. Only share private contact details if they’ve agreed."
          error={errors.nomineeContact?.message}
          {...register("nomineeContact")}
        />
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="eyebrow mb-2 text-accent">About you</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField label="Your name" required autoComplete="name" error={errors.nominatorName?.message} {...register("nominatorName")} />
          <TextField label="Your email" type="email" required autoComplete="email" error={errors.nominatorEmail?.message} {...register("nominatorEmail")} />
        </div>
      </fieldset>

      <CheckboxField
        className="rounded-sm bg-surface-sunk p-6"
        label="I have permission to share these details, or they are already public."
        error={errors.permissionConfirmed?.message}
        {...register("permissionConfirmed")}
      />

      <button type="submit" disabled={isSubmitting} className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}>
        {isSubmitting ? "Sending…" : "Send nomination"}
      </button>
    </form>
  );
}
