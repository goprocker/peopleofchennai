import type { Permission } from "@/lib/auth/permissions";
import type { PublicationAction } from "@/lib/validation/admin";

export type PublicationStatus = "draft" | "in_review" | "published" | "unpublished" | "archived";

/** Which status each action leads to, and which statuses it may start from. */
export const TRANSITIONS: Record<
  Exclude<PublicationAction, "save_draft">,
  { to: PublicationStatus; from: PublicationStatus[]; label: string }
> = {
  submit_review: { to: "in_review", from: ["draft", "unpublished"], label: "Send for review" },
  publish: { to: "published", from: ["draft", "in_review", "unpublished"], label: "Publish" },
  unpublish: { to: "unpublished", from: ["published"], label: "Unpublish" },
  archive: { to: "archived", from: ["draft", "in_review", "unpublished", "published"], label: "Archive" },
};

export type TransitionAction = keyof typeof TRANSITIONS;

export function allowedTransitions(status: PublicationStatus): TransitionAction[] {
  return (Object.keys(TRANSITIONS) as TransitionAction[]).filter((a) => TRANSITIONS[a].from.includes(status));
}

/** Publishing and unpublishing need the publish permission; sending for review and archiving need edit. */
export function transitionPermission(kind: "profiles" | "stories", action: TransitionAction): Permission {
  return action === "publish" || action === "unpublish" ? `${kind}.publish` : `${kind}.edit`;
}

/** Fields to write for a transition. Keeps the first publish date on republish. */
export function transitionPatch(
  action: TransitionAction,
  currentPublishedAt: string | null,
  now = new Date(),
) {
  const to = TRANSITIONS[action].to;
  return {
    publication_status: to,
    published_at: to === "published" ? (currentPublishedAt ?? now.toISOString()) : currentPublishedAt,
  };
}
