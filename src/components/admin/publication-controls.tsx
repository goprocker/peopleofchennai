"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/errors";
import { buttonStyles } from "@/components/ui/button";
import { TRANSITIONS, type TransitionAction } from "@/lib/admin/publication";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

function TransitionButton({ action, kind }: { action: Action; kind: TransitionAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  const variant =
    kind === "publish" ? "accent" : kind === "unpublish" || kind === "archive" ? "outline" : "primary";
  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className={buttonStyles({ variant })}>
        {pending ? "Working…" : TRANSITIONS[kind].label}
      </button>
      <div role="status" aria-live="polite">
        {state && !state.ok && (
          <p className="text-error mt-2 max-w-xs text-sm font-medium">{state.error.message}</p>
        )}
      </div>
    </form>
  );
}

/** One button per allowed transition. Actions arrive pre-bound from the server page. */
export function PublicationControls({ actions }: { actions: { kind: TransitionAction; action: Action }[] }) {
  if (!actions.length) return <p className="text-muted text-sm">No status changes available.</p>;
  return (
    <div className="flex flex-wrap items-start gap-2">
      {actions.map((a) => (
        <TransitionButton key={a.kind} kind={a.kind} action={a.action} />
      ))}
    </div>
  );
}
