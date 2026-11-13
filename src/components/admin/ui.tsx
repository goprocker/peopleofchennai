import Link from "next/link";
import { humanize } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

export { formatDateTime, humanize, qs } from "@/lib/admin/format";

const TONES: Record<string, string> = {
  draft: "bg-surface-sunk text-foreground",
  in_review: "bg-sand/40 text-foreground",
  published: "bg-success/15 text-success",
  unpublished: "bg-error/10 text-error",
  archived: "bg-surface-sunk text-muted",
  pending: "bg-sand/40 text-foreground",
  under_review: "bg-sand/40 text-foreground",
  awaiting_consent: "bg-terracotta/15 text-terracotta-dark",
  approved: "bg-success/15 text-success",
  rejected: "bg-error/10 text-error",
  new: "bg-terracotta/15 text-terracotta-dark",
  read: "bg-surface-sunk text-foreground",
  resolved: "bg-success/15 text-success",
  granted: "bg-success/15 text-success",
  requested: "bg-sand/40 text-foreground",
  withdrawn: "bg-error/10 text-error",
  declined: "bg-error/10 text-error",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONES[status] ?? TONES.draft,
      )}
    >
      {humanize(status)}
    </span>
  );
}

export function AdminHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="border-border mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="text-muted text-sm underline-offset-4 hover:underline">
            ← {back.label}
          </Link>
        )}
        <h1 className="mt-1 text-2xl font-semibold break-words">{title}</h1>
        {description && <p className="text-muted mt-1 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-border bg-surface rounded-md border p-5", className)}>
      {title && <h2 className="mb-4 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-border text-muted rounded-md border border-dashed p-8 text-center text-sm">
      {children}
    </p>
  );
}

/** Responsive table: scrolls horizontally inside itself, never the page. */
export function DataTable({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="border-border bg-surface overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-border bg-surface-sunk/60 text-muted border-b text-xs tracking-wide uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border divide-y">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}

export function SimplePager({
  page,
  total,
  pageSize,
  hrefFor,
}: {
  page: number;
  total: number;
  pageSize: number;
  hrefFor: (p: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link className="underline underline-offset-4" href={hrefFor(page - 1)}>
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link className="underline underline-offset-4" href={hrefFor(page + 1)}>
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** GET filter bar: works without JS. */
export function FilterBar({
  action,
  q,
  status,
  statuses,
  extra,
}: {
  action: string;
  q?: string;
  status?: string;
  statuses: readonly string[];
  extra?: React.ReactNode;
}) {
  const control = "rounded-sm border border-border bg-surface px-3 py-2 text-sm";
  return (
    <form action={action} method="get" className="mb-5 flex flex-wrap items-end gap-3" role="search">
      <label className="text-sm">
        <span className="block font-semibold">Search</span>
        <input name="q" defaultValue={q} className={cn(control, "mt-1 w-56")} />
      </label>
      <label className="text-sm">
        <span className="block font-semibold">Status</span>
        <select name="status" defaultValue={status ?? ""} className={cn(control, "mt-1")}>
          <option value="">All</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
      </label>
      {extra}
      <button
        type="submit"
        className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold"
      >
        Filter
      </button>
    </form>
  );
}
