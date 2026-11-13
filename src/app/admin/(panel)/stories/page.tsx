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
import { buttonStyles } from "@/components/ui/button";
import { ADMIN_PAGE_SIZE, dbFail, ilikeTerm, pageRange } from "@/lib/admin/db";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminListQuerySchema } from "@/lib/validation/query";

export const metadata = { title: "Stories" };

const STATUSES = ["draft", "in_review", "published", "unpublished", "archived"] as const;

export default async function AdminStoriesPage({ searchParams }: PageProps<"/admin/stories">) {
  const session = await requirePagePermission("stories.view");
  const raw = await searchParams;
  const { q, status, page } = adminListQuerySchema.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined])),
  );
  const validStatus = (STATUSES as readonly string[]).includes(status ?? "") ? status : undefined;

  const db = await createSupabaseServerClient();
  let query = db
    .from("stories")
    .select(
      "id, title, slug, publication_status, is_sample, featured, updated_at, profile:profiles(full_name)",
      {
        count: "exact",
      },
    )
    .order("updated_at", { ascending: false })
    .range(...pageRange(page));
  if (validStatus) query = query.eq("publication_status", validStatus);
  if (q) {
    const t = ilikeTerm(q);
    query = query.or(`title.ilike.${t},excerpt.ilike.${t},slug.ilike.${t}`);
  }
  const { data, count, error } = await query;
  if (error && error.code !== "PGRST103") dbFail("list_stories", error);

  return (
    <>
      <AdminHeader
        title="Stories"
        description="Long-form features. A story linked to a person can only be published while their profile is."
        actions={
          can(session.role, "stories.edit") && (
            <Link href="/admin/stories/new" className={buttonStyles()}>
              New story
            </Link>
          )
        }
      />
      <FilterBar action="/admin/stories" q={q} status={validStatus} statuses={STATUSES} />
      {data?.length ? (
        <DataTable head={["Title", "About", "Status", "Updated"]}>
          {data.map((s) => {
            const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
            return (
              <tr key={s.id}>
                <Td>
                  <Link
                    href={`/admin/stories/${s.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {s.title}
                  </Link>
                  <p className="text-muted text-xs">
                    /{s.slug}
                    {s.is_sample && " · sample"}
                    {s.featured && " · featured"}
                  </p>
                </Td>
                <Td className="text-muted">{profile?.full_name ?? "—"}</Td>
                <Td>
                  <StatusBadge status={s.publication_status} />
                </Td>
                <Td className="text-muted whitespace-nowrap">{formatDateTime(s.updated_at)}</Td>
              </tr>
            );
          })}
        </DataTable>
      ) : (
        <EmptyState>No stories match these filters.</EmptyState>
      )}
      <SimplePager
        page={page}
        total={count ?? 0}
        pageSize={ADMIN_PAGE_SIZE}
        hrefFor={(p) => `/admin/stories${qs({ q, status: validStatus, page: p })}`}
      />
    </>
  );
}
