import {
  AdminHeader,
  DataTable,
  EmptyState,
  formatDateTime,
  qs,
  SimplePager,
  Td,
} from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, dbFail, pageRange } from "@/lib/admin/db";
import { requirePagePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const metadata = { title: "Audit log" };

const querySchema = z.object({
  entity: z
    .string()
    .regex(/^[a-z_]{1,40}$/)
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
});

const ENTITY_TYPES = [
  "profile",
  "story",
  "submission",
  "consent",
  "media",
  "category",
  "neighbourhood",
  "contact_message",
  "settings",
  "editor",
];

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requirePagePermission("audit.view");
  const raw = await searchParams;
  const { entity, page } = querySchema.parse({
    entity: typeof raw.entity === "string" && raw.entity ? raw.entity : undefined,
    page: raw.page,
  });

  const db = await createSupabaseServerClient();
  let query = db
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...pageRange(page));
  if (entity) query = query.eq("entity_type", entity);
  const { data, count, error } = await query;
  if (error && error.code !== "PGRST103") dbFail("list_audit", error);

  const actorIds = [...new Set((data ?? []).map((r) => r.actor_id).filter(Boolean))];
  const { data: actors } = actorIds.length
    ? await db.from("editor_roles").select("user_id, display_name").in("user_id", actorIds)
    : { data: [] };
  const actorName = new Map((actors ?? []).map((a) => [a.user_id, a.display_name]));

  return (
    <>
      <AdminHeader
        title="Audit log"
        description="Every editorial change, newest first. Entries can’t be edited or deleted."
      />
      <form method="get" action="/admin/audit" className="mb-5 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block font-semibold">Entity</span>
          <select
            name="entity"
            defaultValue={entity ?? ""}
            className="border-border bg-surface mt-1 rounded-sm border px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {ENTITY_TYPES.map((e) => (
              <option key={e} value={e}>
                {e.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold"
        >
          Filter
        </button>
      </form>
      {data?.length ? (
        <DataTable head={["When", "Who", "Action", "Target", "Details"]}>
          {data.map((r) => (
            <tr key={r.id}>
              <Td className="text-muted whitespace-nowrap">{formatDateTime(r.created_at)}</Td>
              <Td>
                {(r.actor_id && actorName.get(r.actor_id)) ||
                  (r.actor_id ? `${r.actor_id.slice(0, 8)}…` : "system")}
              </Td>
              <Td className="font-mono text-xs">{r.action}</Td>
              <Td className="text-xs">
                {r.entity_type}
                {r.entity_id && <span className="text-muted block">{String(r.entity_id).slice(0, 8)}…</span>}
              </Td>
              <Td className="text-muted max-w-xs font-mono text-xs break-all">
                {Object.keys(r.metadata ?? {}).length ? JSON.stringify(r.metadata) : "—"}
              </Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState>No audit entries.</EmptyState>
      )}
      <SimplePager
        page={page}
        total={count ?? 0}
        pageSize={ADMIN_PAGE_SIZE}
        hrefFor={(p) => `/admin/audit${qs({ entity, page: p })}`}
      />
    </>
  );
}
