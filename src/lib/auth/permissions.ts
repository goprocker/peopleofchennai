import type { EditorRole } from "@/types/domain";

/** Single source of truth for what each role may do. Enforced server-side (and mirrored by RLS). */
export const PERMISSIONS = {
  "dashboard.view": ["super_admin", "editor", "reviewer"],
  "submissions.view": ["super_admin", "editor", "reviewer"],
  "submissions.review": ["super_admin", "editor", "reviewer"],
  "submissions.note": ["super_admin", "editor", "reviewer"],
  "submissions.convert": ["super_admin", "editor"],
  "consent.record": ["super_admin", "editor"],
  "profiles.view": ["super_admin", "editor", "reviewer"],
  "profiles.edit": ["super_admin", "editor"],
  "profiles.publish": ["super_admin", "editor"],
  "stories.view": ["super_admin", "editor", "reviewer"],
  "stories.edit": ["super_admin", "editor"],
  "stories.publish": ["super_admin", "editor"],
  "media.manage": ["super_admin", "editor"],
  "categories.manage": ["super_admin", "editor"],
  "contact.view": ["super_admin", "editor", "reviewer"],
  "settings.manage": ["super_admin"],
  "editors.manage": ["super_admin"],
  "audit.view": ["super_admin"],
} as const satisfies Record<string, readonly EditorRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: EditorRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly EditorRole[]).includes(role);
}

export const ROLE_LABELS: Record<EditorRole, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  reviewer: "Reviewer",
};
