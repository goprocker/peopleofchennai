import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Prev/next + compact page list. `hrefFor` builds the URL so filters are preserved. */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const edge = "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold";
  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={cn(edge, "hover:bg-surface-sunk")}>
          <ArrowLeft aria-hidden className="size-4" /> Previous
        </Link>
      ) : (
        <span />
      )}
      <ol className="hidden items-center gap-1 sm:flex">
        {pages.map((p, i) => (
          <li key={p} className="flex items-center gap-1">
            {i > 0 && p - pages[i - 1] > 1 && <span aria-hidden className="px-1 text-muted">…</span>}
            <Link
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Page ${p}`}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-full text-sm",
                p === page ? "bg-primary text-primary-foreground" : "hover:bg-surface-sunk",
              )}
            >
              {p}
            </Link>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted sm:hidden">
        Page {page} of {totalPages}
      </p>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={cn(edge, "hover:bg-surface-sunk")}>
          Next <ArrowRight aria-hidden className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
