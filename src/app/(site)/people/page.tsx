import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { PeopleFilters } from "@/components/people/people-filters";
import { PersonGrid } from "@/components/people/person-card";
import { Pagination } from "@/components/ui/pagination";
import { listCategories, listNeighbourhoods, listPeople } from "@/lib/db/public";
import { parsePeopleQuery, peopleQueryToSearch } from "@/lib/validation/query";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const q = parsePeopleQuery(await searchParams);
  const filtered = Boolean(q.q || q.category || q.neighbourhood || q.page > 1);
  return {
    title: "People",
    description: "Browse the people of Chennai by name, work or neighbourhood.",
    alternates: { canonical: "/people" },
    // Keep filtered/search variants out of the index; the canonical list is enough.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function PeoplePage({ searchParams }: { searchParams: SearchParams }) {
  const query = parsePeopleQuery(await searchParams);
  const [result, categories, neighbourhoods] = await Promise.all([
    listPeople(query),
    listCategories(),
    listNeighbourhoods(),
  ]);
  const filtered = Boolean(query.q || query.category || query.neighbourhood);

  return (
    <PageContainer width="wide" className="pt-14 md:pt-20">
      <header className="max-w-3xl">
        <p className="eyebrow text-accent">The directory</p>
        <h1 className="display-lg mt-4">People of Chennai</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Everyone here said yes to sharing their story. Search by name, by what they do, or by where they live.
        </p>
      </header>

      <div className="mt-10">
        <PeopleFilters query={query} categories={categories} neighbourhoods={neighbourhoods} />
      </div>

      <p className="mt-8 text-sm text-muted" aria-live="polite">
        {result.total === 1 ? "1 person" : `${result.total} people`}
        {filtered && " match your search"}
      </p>

      <div className="mt-6">
        {result.items.length > 0 ? (
          <PersonGrid people={result.items} priorityCount={3} />
        ) : (
          <div className="rounded-sm border border-dashed border-border px-6 py-16 text-center">
            <p className="font-serif text-3xl">No one here yet.</p>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Try a different search, or{" "}
              <Link href="/people" className="text-accent underline underline-offset-4">clear the filters</Link>. Know someone who
              fits? <Link href="/nominate" className="text-accent underline underline-offset-4">Nominate them</Link>.
            </p>
          </div>
        )}
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(page) => `/people${peopleQueryToSearch({ ...query, page })}`}
      />
    </PageContainer>
  );
}
