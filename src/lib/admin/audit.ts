import "server-only";
import type { StaffSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Append-only audit trail. Written as the signed-in user (RLS requires actor_id = auth.uid()).
 * Failures are logged but never block the action that was already committed.
 */
export async function audit(
  session: StaffSession,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
  if (error) logger.error("audit_failed", { action, entityType, message: error.message });
}
