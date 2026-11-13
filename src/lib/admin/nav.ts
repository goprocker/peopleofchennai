import type { Permission } from "@/lib/auth/permissions";

export interface AdminNavItem {
  href: string;
  label: string;
  permission: Permission;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", permission: "dashboard.view" },
  { href: "/admin/submissions", label: "Submissions", permission: "submissions.view" },
  { href: "/admin/messages", label: "Messages", permission: "contact.view" },
  { href: "/admin/people", label: "People", permission: "profiles.view" },
  { href: "/admin/stories", label: "Stories", permission: "stories.view" },
  { href: "/admin/categories", label: "Categories", permission: "categories.manage" },
  { href: "/admin/media", label: "Media", permission: "media.manage" },
  { href: "/admin/settings", label: "Settings", permission: "settings.manage" },
  { href: "/admin/audit", label: "Audit log", permission: "audit.view" },
];

export function isAdminActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}
