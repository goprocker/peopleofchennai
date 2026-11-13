"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";
import type { Category, Neighbourhood } from "@/types/domain";
import { peopleQueryToSearch, type PeopleQuery } from "@/lib/validation/query";
import { cn } from "@/lib/utils";

/**
 * A plain GET form, so it works without JavaScript. With JS, selects apply immediately
 * and navigation runs in a transition so the current results stay visible while loading.
 */
export function PeopleFilters({
  query,
  categories,
  neighbourhoods,
}: {
  query: PeopleQuery;
  categories: Category[];
  neighbourhoods: Neighbourhood[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const apply = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const next: Partial<PeopleQuery> = {
      q: String(fd.get("q") ?? "").trim() || undefined,
      category: String(fd.get("category") ?? "") || undefined,
      neighbourhood: String(fd.get("neighbourhood") ?? "") || undefined,
      sort: fd.get("sort") === "name" ? "name" : "recent",
    };
    startTransition(() => router.push(`/people${peopleQueryToSearch(next)}`, { scroll: false }));
  };

  const select =
    "min-h-11 w-full appearance-none rounded-full border border-border bg-surface px-4 pr-9 text-sm " +
    "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%235a5f55'%3E%3Cpath d='M5 7l5 6 5-6z'/%3E%3C/svg%3E\")] bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat";

  return (
    <form
      action="/people"
      role="search"
      aria-label="Search people"
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === "SELECT") apply(e.currentTarget);
      }}
      className={cn("grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]", pending && "opacity-70")}
      aria-busy={pending}
    >
      <div className="relative">
        <label htmlFor="people-q" className="sr-only">
          Search by name, work or neighbourhood
        </label>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
        <input
          id="people-q"
          name="q"
          type="search"
          defaultValue={query.q ?? ""}
          maxLength={80}
          placeholder="Search by name, work or neighbourhood"
          className="min-h-11 w-full rounded-full border border-border bg-surface pr-4 pl-10 text-sm placeholder:text-muted"
        />
      </div>
      <div>
        <label htmlFor="people-category" className="sr-only">Category</label>
        <select id="people-category" name="category" defaultValue={query.category ?? ""} className={select}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="people-neighbourhood" className="sr-only">Neighbourhood</label>
        <select id="people-neighbourhood" name="neighbourhood" defaultValue={query.neighbourhood ?? ""} className={select}>
          <option value="">All neighbourhoods</option>
          {neighbourhoods.map((n) => (
            <option key={n.slug} value={n.slug}>{n.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="people-sort" className="sr-only">Sort</label>
        <select id="people-sort" name="sort" defaultValue={query.sort} className={select}>
          <option value="recent">Newest first</option>
          <option value="name">A–Z</option>
        </select>
      </div>
      <noscript>
        <button type="submit" className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Search
        </button>
      </noscript>
    </form>
  );
}
