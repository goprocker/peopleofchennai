import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { can, type Permission } from "./permissions";
import type { EditorRole } from "@/types/domain";

export interface StaffSession {
  userId: string;
  email: string;
  role: EditorRole;
  displayName: string | null;
}

/** Verifies the JWT with Supabase Auth (getUser, not getSession) and loads the role from the DB. */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: roleRow } = await supabase
    .from("editor_roles")
    .select("role, display_name")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!roleRow) return null;
  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    role: roleRow.role as EditorRole,
    displayName: roleRow.display_name,
  };
});

/** For pages/layouts: redirect to login when unauthenticated, 403 page when lacking permission. */
export async function requirePagePermission(permission: Permission): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  if (!can(session.role, permission)) redirect("/admin?denied=1");
  return session;
}

/** For actions/route handlers: throw typed errors. */
export async function requirePermission(permission: Permission): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) throw new AppError("UNAUTHENTICATED", "Please sign in.");
  if (!can(session.role, permission)) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  return session;
}
