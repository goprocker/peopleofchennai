"use client";

import { useEffect, useState } from "react";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { buttonStyles } from "@/components/ui/button";
import { CONTACT_SUBJECTS, contactSchema } from "@/lib/validation/public-forms";
import { FormAlert, Honeypot, SelectField, TextAreaField, TextField } from "./fields";
import { formStartTime, submitPublicForm } from "./submit-request";

type In = z.input<typeof contactSchema>;
type Out = z.output<typeof contactSchema>;
type Subject = In["subject"];

export function ContactForm({ initialSubject }: { initialSubject?: Subject }) {
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", subject: initialSubject ?? "general", message: "", website_hp: "", startedAt: 1 },
  });
  useEffect(() => setValue("startedAt", formStartTime()), [setValue]);

  const onSubmit = async (values: Out) => {
    setStatus(null);
    const result = await submitPublicForm("/api/contact", values);
    if (result.ok) {
      reset({ subject: "general" });
      setValue("startedAt", formStartTime());
      setStatus({ tone: "success", message: "Message received. We usually reply within a few working days." });
      return;
    }
    Object.entries(result.fields ?? {}).forEach(([key, msgs]) => setError(key as Path<In>, { message: msgs[0] }));
    setStatus({ tone: "error", message: result.message });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-6">
      {status && <FormAlert tone={status.tone}>{status.message}</FormAlert>}
      <Honeypot {...register("website_hp")} />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField label="Your name" required autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField label="Email" type="email" required autoComplete="email" error={errors.email?.message} {...register("email")} />
      </div>
      <SelectField
        label="What’s this about?"
        required
        options={CONTACT_SUBJECTS.map((s) => ({ value: s.value, label: s.label }))}
        error={errors.subject?.message}
        {...register("subject")}
      />
      <TextAreaField label="Message" required rows={7} maxLength={5000} error={errors.message?.message} {...register("message")} />
      <button type="submit" disabled={isSubmitting} className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}>
        {isSubmitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
