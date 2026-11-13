import { PageContainer } from "@/components/layout/page-container";

export default function Loading() {
  return (
    <PageContainer width="wide" className="pt-14 md:pt-20" aria-busy="true">
      <span className="sr-only" role="status">Loading…</span>
      <div className="h-4 w-32 animate-pulse rounded bg-surface-sunk" />
      <div className="mt-6 h-14 w-2/3 animate-pulse rounded bg-surface-sunk" />
      <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <div className="aspect-[4/5] animate-pulse rounded-sm bg-surface-sunk" />
            <div className="mt-4 h-6 w-1/2 animate-pulse rounded bg-surface-sunk" />
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
