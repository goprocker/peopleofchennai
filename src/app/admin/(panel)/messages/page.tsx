import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AdminHeader,
  EmptyState,
  FilterBar,
  formatDateTime,
  qs,
  SimplePager,
  StatusBadge,
} from "@/components/admin/ui";
import { audit } from "@/lib/admin/audit";
import { ADMIN_PAGE_SIZE, dbFail, ilikeTerm, pageRange } from "@/lib/admin/db";
import { requirePagePermission, requirePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTACT_SUBJECTS } from "@/lib/validation/public-forms";
import { adminListQuerySchema } from "@/lib/validation/query";

export const metadata = { title: "Messages" };

const STATUSES = ["new", "read", "resolved"] as const;
const SUBJECT_LABEL = Object.fromEntries(CONTACT_SUBJECTS.map((s) => [s.value, s.label]));

async function setMessageStatus(form: FormData) {
  "use server";
  const session = await requirePermission("contact.view");
  const id = z.uuid().parse(form.get("id"));
  const status = z.enum(STATUSES).parse(form.get("status"));
  const db = await createSupabaseServerClient();
  const { error } = await db.from("contact_messages").update({ status }).eq("id", id);
  if (error) dbFail("set_message_status", error);
  await audit(session, "contact.status", "contact_message", id, { status });
  revalidatePath("/admin/messages");
}

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requirePagePermission("contact.view");
  const raw = await searchParams;
  const { q, status, page } = adminListQuerySchema.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined])),
  );
  const validStatus = (STATUSES as readonly string[]).includes(status ?? "") ? status : undefined;

  const db = await createSupabaseServerClient();
  let query = db
    .from("contact_messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...pageRange(page));
  if (validStatus) query = query.eq("status", validStatus);
  if (q) {
    const t = ilikeTerm(q);
    query = query.or(`name.ilike.${t},email.ilike.${t},message.ilike.${t}`);
  }
  const { data, count, error } = await query;
  if (error && error.code !== "PGRST103") dbFail("list_messages", error);

  return (
    <>
      <AdminHeader
        title="Messages"
        description="Contact form messages. Removal and consent-withdrawal requests should be handled first."
      />
      <FilterBar action="/admin/messages" q={q} status={validStatus} statuses={STATUSES} />
      {data?.length ? (
        <ul className="space-y-3">
          {data.map((m) => {
            const urgent = m.subject === "removal" || m.subject === "consent_withdrawal";
            return (
              <li
                key={m.id}
                className={`bg-surface rounded-md border p-4 ${urgent && m.status !== "resolved" ? "border-terracotta" : "border-border"}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={m.status} />
                  <span className={`font-semibold ${urgent ? "text-terracotta-dark" : ""}`}>
                    {SUBJECT_LABEL[m.subject] ?? m.subject}
                  </span>
                  <span className="text-muted">· {formatDateTime(m.created_at)}</span>
                </div>
                <p className="mt-2 text-sm">
                  <span className="font-medium">{m.name}</span>{" "}
                  <a href={`mailto:${m.email}`} className="text-muted break-all underline underline-offset-4">
                    {m.email}
                  </a>
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap">{m.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUSES.filter((s) => s !== m.status).map((s) => (
                    <form key={s} action={setMessageStatus}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="status" value={s} />
                      <button
                        type="submit"
                        className="border-border hover:bg-surface-sunk rounded-full border px-3 py-1 text-xs font-semibold"
                      >
                        Mark {s}
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState>No messages match these filters.</EmptyState>
      )}
      <SimplePager
        page={page}
        total={count ?? 0}
        pageSize={ADMIN_PAGE_SIZE}
        hrefFor={(p) => `/admin/messages${qs({ q, status: validStatus, page: p })}`}
      />
    </>
  );
}
