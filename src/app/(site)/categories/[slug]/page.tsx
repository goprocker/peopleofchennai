import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PersonGrid } from "@/components/people/person-card";
import { Pagination } from "@/components/ui/pagination";
import { getCategory, listCategories, listPeople } from "@/lib/db/public";
import { listQuerySchema } from "@/lib/validation/query";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return { title: "Not found" };
  return {
    title: category.name,
    description: category.description ?? `People of Chennai — ${category.name}.`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const category = await getCategory((await params).slug);
  if (!category) notFound();
  const sp = await searchParams;
  const { page } = listQuerySchema.parse({ page: Array.isArray(sp.page) ? sp.page[0] : sp.page });
  const [result, categories] = await Promise.all([
    listPeople({ category: category.slug, sort: "recent", page }),
    listCategories(),
  ]);

  return (
    <PageContainer width="wide" className="pt-14 md:pt-20">
      <header className="max-w-3xl">
        <Link href="/people" className="eyebrow text-accent hover:underline">People</Link>
        <h1 className="display-lg mt-4">{category.name}</h1>
        {category.description && <p className="mt-5 text-lg leading-relaxed text-muted">{category.description}</p>}
      </header>

      <nav aria-label="Other categories" className="mt-8 -mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 pb-2">
          {categories.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link
                href={`/categories/${c.slug}`}
                aria-current={c.slug === category.slug ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm whitespace-nowrap hover:border-foreground aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10">
        {result.items.length > 0 ? (
          <PersonGrid people={result.items} priorityCount={3} />
        ) : (
          <p className="font-serif text-3xl">
            No one here yet. <Link href="/nominate" className="text-accent underline underline-offset-4">Nominate someone?</Link>
          </p>
        )}
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(p) => (p > 1 ? `/categories/${category.slug}?page=${p}` : `/categories/${category.slug}`)}
      />
    </PageContainer>
  );
}
