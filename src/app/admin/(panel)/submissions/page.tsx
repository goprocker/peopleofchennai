import Link from "next/link";
import {
  AdminHeader,
  DataTable,
  EmptyState,
  FilterBar,
  formatDateTime,
  qs,
  SimplePager,
  StatusBadge,
  Td,
} from "@/components/admin/ui";
import { ADMIN_PAGE_SIZE, dbFail, ilikeTerm, pageRange } from "@/lib/admin/db";
import { requirePagePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { REVIEW_STATUSES } from "@/lib/validation/admin";
import { adminListQuerySchema } from "@/lib/validation/query";

export const metadata = { title: "Submissions" };

export default async function SubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  await requirePagePermission("submissions.view");
  const raw = await searchParams;
  const { q, status, type, page } = adminListQuerySchema.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined])),
  );
  const validStatus = (REVIEW_STATUSES as readonly string[]).includes(status ?? "") ? status : undefined;

  const db = await createSupabaseServerClient();
  let query = db
    .from("submissions")
    .select("id, submission_type, submitter_name, nominee_name, story_pitch, review_status, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(...pageRange(page));
  if (validStatus) query = query.eq("review_status", validStatus);
  if (type) query = query.eq("submission_type", type);
  if (q) {
    const t = ilikeTerm(q);
    query = query.or(`submitter_name.ilike.${t},nominee_name.ilike.${t},story_pitch.ilike.${t}`);
  }
  const { data, count, error } = await query;
  if (error && error.code !== "PGRST103") dbFail("list_submissions", error);

  return (
    <>
      <AdminHeader title="Submissions" description="Stories people sent in and nominations, newest first." />
      <FilterBar
        action="/admin/submissions"
        q={q}
        status={validStatus}
        statuses={REVIEW_STATUSES}
        extra={
          <label className="text-sm">
            <span className="block font-semibold">Type</span>
            <select
              name="type"
              defaultValue={type ?? ""}
              className="border-border bg-surface mt-1 rounded-sm border px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="self">Self</option>
              <option value="nomination">Nomination</option>
            </select>
          </label>
        }
      />
      {data?.length ? (
        <DataTable head={["Person", "Pitch", "Type", "Status", "Received"]}>
          {data.map((s) => (
            <tr key={s.id}>
              <Td>
                <Link
                  href={`/admin/submissions/${s.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {s.submission_type === "nomination" ? s.nominee_name : s.submitter_name}
                </Link>
                {s.submission_type === "nomination" && (
                  <p className="text-muted text-xs">by {s.submitter_name}</p>
                )}
              </Td>
              <Td className="text-muted max-w-xs">
                <span className="line-clamp-2">{s.story_pitch}</span>
              </Td>
              <Td className="capitalize">{s.submission_type}</Td>
              <Td>
                <StatusBadge status={s.review_status} />
              </Td>
              <Td className="text-muted whitespace-nowrap">{formatDateTime(s.created_at)}</Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState>No submissions match these filters.</EmptyState>
      )}
      <SimplePager
        page={page}
        total={count ?? 0}
        pageSize={ADMIN_PAGE_SIZE}
        hrefFor={(p) => `/admin/submissions${qs({ q, status: validStatus, type, page: p })}`}
      />
    </>
  );
}
