"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible form primitives. Each control is wired to its label, hint and error via
 * aria-describedby, and marks aria-invalid when there is an error.
 */

const control =
  "w-full rounded-sm border border-border bg-surface px-4 py-3 text-base placeholder:text-muted/80 " +
  "aria-[invalid=true]:border-error focus-visible:border-foreground";

interface FieldProps {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

function useFieldIds() {
  const id = useId();
  return { id, hintId: `${id}-hint`, errorId: `${id}-error` };
}

function FieldShell({
  label,
  hint,
  error,
  required,
  className,
  ids,
  children,
}: FieldProps & { ids: ReturnType<typeof useFieldIds>; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={ids.id} className="block font-semibold">
        {label}
        {required ? (
          <span aria-hidden className="ml-1 text-accent">*</span>
        ) : (
          <span className="ml-2 text-sm font-normal text-muted">(optional)</span>
        )}
      </label>
      {hint && (
        <p id={ids.hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
      {error && (
        <p id={ids.errorId} className="mt-2 text-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (ids: ReturnType<typeof useFieldIds>, hint: unknown, error: unknown) =>
  [hint && ids.hintId, error && ids.errorId].filter(Boolean).join(" ") || undefined;

export const TextField = forwardRef<HTMLInputElement, FieldProps & React.InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, hint, error, required, className, ...input }, ref) {
    const ids = useFieldIds();
    return (
      <FieldShell {...{ label, hint, error, required, className, ids }}>
        <input
          ref={ref}
          id={ids.id}
          aria-invalid={Boolean(error)}
          aria-required={required}
          aria-describedby={describedBy(ids, hint, error)}
          className={control}
          {...input}
        />
      </FieldShell>
    );
  },
);

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement> & { count?: number }
>(function TextAreaField({ label, hint, error, required, className, count, maxLength, ...input }, ref) {
  const ids = useFieldIds();
  return (
    <FieldShell {...{ label, hint, error, required, className, ids }}>
      <textarea
        ref={ref}
        id={ids.id}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-required={required}
        aria-describedby={describedBy(ids, hint, error)}
        className={cn(control, "min-h-32 leading-relaxed")}
        {...input}
      />
      {maxLength && count !== undefined && (
        <p className="mt-1 text-right text-xs text-muted" aria-live="off">
          {count.toLocaleString()} / {maxLength.toLocaleString()}
        </p>
      )}
    </FieldShell>
  );
});

export const SelectField = forwardRef<
  HTMLSelectElement,
  FieldProps & React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }
>(function SelectField({ label, hint, error, required, className, options, placeholder, ...input }, ref) {
  const ids = useFieldIds();
  return (
    <FieldShell {...{ label, hint, error, required, className, ids }}>
      <select
        ref={ref}
        id={ids.id}
        aria-invalid={Boolean(error)}
        aria-required={required}
        aria-describedby={describedBy(ids, hint, error)}
        className={control}
        {...input}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

export const CheckboxField = forwardRef<
  HTMLInputElement,
  { label: React.ReactNode; error?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>
>(function CheckboxField({ label, error, className, ...input }, ref) {
  const ids = useFieldIds();
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={ids.id}
          type="checkbox"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? ids.errorId : undefined}
          className="mt-1 size-5 shrink-0 accent-terracotta"
          {...input}
        />
        <label htmlFor={ids.id} className="leading-relaxed">
          {label}
        </label>
      </div>
      {error && (
        <p id={ids.errorId} className="mt-2 ml-8 text-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
});

/**
 * Honeypot: hidden from people and assistive tech, but naive bots fill it in.
 * Register as `website_hp`.
 */
export const Honeypot = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Honeypot(props, ref) {
    return (
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this field empty
          <input ref={ref} type="text" tabIndex={-1} autoComplete="off" {...props} />
        </label>
      </div>
    );
  },
);

export function FormAlert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-sm border-l-4 px-5 py-4",
        tone === "error" ? "border-error bg-error/5 text-error" : "border-success bg-success/5 text-success",
      )}
    >
      {children}
    </div>
  );
}
