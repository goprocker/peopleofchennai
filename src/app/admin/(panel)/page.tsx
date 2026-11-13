import Link from "next/link";
import {
  AdminHeader,
  DataTable,
  EmptyState,
  formatDateTime,
  Panel,
  StatusBadge,
  Td,
} from "@/components/admin/ui";
import { requirePagePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  await requirePagePermission("dashboard.view");
  const { denied } = await searchParams;
  const db = await createSupabaseServerClient();
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const head = { count: "exact" as const, head: true };

  const [pending, awaitingConsent, newMessages, inReview, published, recent] = await Promise.all([
    count(db.from("submissions").select("id", head).in("review_status", ["pending", "under_review"])),
    count(db.from("submissions").select("id", head).eq("review_status", "awaiting_consent")),
    count(db.from("contact_messages").select("id", head).eq("status", "new")),
    count(db.from("profiles").select("id", head).eq("publication_status", "in_review")),
    count(db.from("profiles").select("id", head).eq("publication_status", "published")),
    db
      .from("submissions")
      .select("id, submission_type, submitter_name, nominee_name, review_status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const stats = [
    { label: "Submissions to review", value: pending, href: "/admin/submissions?status=pending" },
    { label: "Awaiting consent", value: awaitingConsent, href: "/admin/submissions?status=awaiting_consent" },
    { label: "New messages", value: newMessages, href: "/admin/messages?status=new" },
    { label: "Profiles in review", value: inReview, href: "/admin/people?status=in_review" },
    { label: "Published profiles", value: published, href: "/admin/people?status=published" },
  ];

  return (
    <>
      <AdminHeader title="Dashboard" description="What needs attention today." />
      {denied && (
        <p role="alert" className="border-error/40 bg-error/5 text-error mb-6 rounded-md border p-3 text-sm">
          Your role doesn’t have access to that page.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className="border-border bg-surface hover:border-foreground block h-full rounded-md border p-4"
            >
              <span className="block text-3xl font-semibold tabular-nums">{s.value}</span>
              <span className="text-muted mt-1 block text-sm">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Panel title="Latest submissions" className="mt-8">
        {recent.data?.length ? (
          <DataTable head={["From", "Type", "Status", "Received"]}>
            {recent.data.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link
                    href={`/admin/submissions/${r.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {r.submission_type === "nomination" ? `${r.nominee_name} (nominated)` : r.submitter_name}
                  </Link>
                </Td>
                <Td className="capitalize">{r.submission_type}</Td>
                <Td>
                  <StatusBadge status={r.review_status} />
                </Td>
                <Td className="text-muted">{formatDateTime(r.created_at)}</Td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState>No submissions yet.</EmptyState>
        )}
      </Panel>
    </>
  );
}
