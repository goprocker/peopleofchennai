"use client";

import { startTransition, useActionState, useId } from "react";
import type { ActionResult } from "@/lib/errors";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

/**
 * Progressive-enhancement form around a Server Action: works without JS, shows the
 * action's message and per-field errors.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Saving…",
  successMessage = "Saved.",
  className,
  submitVariant = "primary",
}: {
  action: Action;
  children: (state: {
    fieldError: (name: string) => string | undefined;
    pending: boolean;
  }) => React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  successMessage?: string;
  className?: string;
  submitVariant?: "primary" | "accent" | "outline" | "ghost";
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const statusId = useId();
  const fieldError = (name: string) => (state && !state.ok ? state.error.fields?.[name]?.[0] : undefined);

  return (
    <form
      action={formAction}
      // With JS, submit manually so React doesn't auto-reset the fields (keeps edits after a failed save).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className={cn("space-y-5", className)}
      aria-describedby={statusId}
      noValidate
    >
      {children({ fieldError, pending })}
      <div id={statusId} role="status" aria-live="polite">
        {state && !state.ok && <p className="text-error text-sm font-medium">{state.error.message}</p>}
        {state?.ok && <p className="text-success text-sm font-medium">{state.message ?? successMessage}</p>}
      </div>
      <button type="submit" disabled={pending} className={buttonStyles({ variant: submitVariant })}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

const control =
  "w-full rounded-sm border border-border bg-surface px-3 py-2 text-base aria-[invalid=true]:border-error focus-visible:border-foreground";

/** Uncontrolled input for Server Action forms. */
export function AdminField({
  label,
  name,
  error,
  hint,
  as = "input",
  rows,
  options,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  as?: "input" | "textarea" | "select";
  rows?: number;
  options?: { value: string; label: string }[];
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: control,
  };
  const { defaultValue, required } = rest;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
        {required && (
          <span aria-hidden className="text-accent ml-1">
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-muted mt-0.5 text-xs">
          {hint}
        </p>
      )}
      <div className="mt-1.5">
        {as === "textarea" ? (
          <textarea
            {...common}
            rows={rows ?? 4}
            defaultValue={defaultValue as string | undefined}
            required={required}
          />
        ) : as === "select" ? (
          <select {...common} defaultValue={defaultValue as string | undefined} required={required}>
            {options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input {...common} {...rest} />
        )}
      </div>
      {error && (
        <p id={`${id}-err`} className="text-error mt-1 text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
