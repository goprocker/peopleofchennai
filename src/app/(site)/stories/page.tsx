import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { StoryCard } from "@/components/stories/story-card";
import { Pagination } from "@/components/ui/pagination";
import { listStories } from "@/lib/db/public";
import { listQuerySchema } from "@/lib/validation/query";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Stories",
  description: "Long-form stories about the people of Chennai.",
  alternates: { canonical: "/stories" },
};

export default async function StoriesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { page } = listQuerySchema.parse({ page: Array.isArray(sp.page) ? sp.page[0] : sp.page });
  const result = await listStories(page);

  return (
    <PageContainer width="wide" className="pt-14 md:pt-20">
      <header className="max-w-3xl">
        <p className="eyebrow text-accent">Long reads</p>
        <h1 className="display-lg mt-4">Stories</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Slower, longer pieces: a morning with a turtle-walk volunteer, an evening in a terrace music room.
        </p>
      </header>

      {result.items.length > 0 ? (
        <ul className="mt-14 space-y-16">
          {result.items.map((s, i) => (
            <li key={s.id}>
              <StoryCard story={s} headingLevel="h2" />
              {i < result.items.length - 1 && <hr className="mt-16 border-border" />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-14 font-serif text-3xl">No stories here yet — check back soon.</p>
      )}

      <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => (p > 1 ? `/stories?page=${p}` : "/stories")} />
    </PageContainer>
  );
}
