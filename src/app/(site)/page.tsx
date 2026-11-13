import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { EditorialDivider } from "@/components/layout/editorial-divider";
import { PageContainer } from "@/components/layout/page-container";
import { SectionHeading } from "@/components/layout/section-heading";
import { PersonCard, PersonGrid } from "@/components/people/person-card";
import { StoryCard } from "@/components/stories/story-card";
import { buttonStyles } from "@/components/ui/button";
import {
  getPerson,
  listCategories,
  listFeaturedPeople,
  listFeaturedStories,
  listNeighbourhoods,
  listRecentPeople,
} from "@/lib/db/public";

export const revalidate = 300;

export default async function HomePage() {
  const [featured, recent, stories, categories, neighbourhoods] = await Promise.all([
    listFeaturedPeople(3),
    listRecentPeople(6),
    listFeaturedStories(2),
    listCategories(),
    listNeighbourhoods(),
  ]);
  const quoteSource = featured[0] ? await getPerson(featured[0].slug) : null;
  const featuredIds = new Set(featured.map((p) => p.id));
  const moreRecent = recent.filter((p) => !featuredIds.has(p.id)).slice(0, 6);

  return (
    <>
      {/* 1 · Masthead */}
      <PageContainer as="section" width="wide" className="pt-14 pb-16 md:pt-24 md:pb-24" aria-labelledby="home-title">
        <p className="eyebrow text-accent">An archive of the city, one person at a time</p>
        <h1 id="home-title" className="display-xl mt-6 max-w-5xl">
          The people who make <em className="text-terracotta">Chennai</em>, in their own words.
        </h1>
        <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            Teachers and tea-stall owners, coders and coaches. Read their stories, then tell us about someone
            we should meet — maybe it’s you.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/people" className={buttonStyles({ size: "lg" })}>
              Meet the people
            </Link>
            <Link href="/submit" className={buttonStyles({ variant: "outline", size: "lg" })}>
              Share your story
            </Link>
          </div>
        </div>
      </PageContainer>

      {/* 2 · Featured people */}
      {featured.length > 0 && (
        <PageContainer as="section" width="wide" aria-labelledby="featured-title">
          <SectionHeading id="featured-title" eyebrow="In focus" title="This week’s people" action={{ href: "/people", label: "All people" }} />
          <ul className="mt-10 grid gap-x-6 gap-y-12 md:grid-cols-3">
            {featured.map((p, i) => (
              <li key={p.id} className={i === 1 ? "md:mt-16" : undefined}>
                <Reveal delay={i * 0.08}>
                  <PersonCard person={p} size="large" priority={i === 0} />
                </Reveal>
              </li>
            ))}
          </ul>
        </PageContainer>
      )}

      {/* 3 · Pull quote */}
      {quoteSource?.pullQuote && (
        <section aria-label="Quote" className="mt-24 bg-surface-sunk py-20 md:py-28">
          <PageContainer width="narrow">
            <Reveal>
              <figure>
                <blockquote className="display-lg text-balance">“{quoteSource.pullQuote}”</blockquote>
                <figcaption className="mt-8 text-sm">
                  —{" "}
                  <Link href={`/people/${quoteSource.slug}`} className="font-semibold underline-offset-4 hover:underline">
                    {quoteSource.fullName}
                  </Link>
                  {quoteSource.neighbourhood && <span className="text-muted">, {quoteSource.neighbourhood.name}</span>}
                </figcaption>
              </figure>
            </Reveal>
          </PageContainer>
        </section>
      )}

      {/* 4 · Recently added */}
      {moreRecent.length > 0 && (
        <PageContainer as="section" width="wide" className="mt-24" aria-labelledby="recent-title">
          <SectionHeading id="recent-title" eyebrow="Just added" title="New faces" action={{ href: "/people", label: "Browse everyone" }} />
          <div className="mt-10">
            <PersonGrid people={moreRecent} />
          </div>
        </PageContainer>
      )}

      {/* 5 · Categories */}
      <PageContainer as="section" width="wide" className="mt-24" aria-labelledby="categories-title">
        <EditorialDivider variant="kolam" className="mb-16" />
        <SectionHeading id="categories-title" eyebrow="Explore" title="Find people by what they do" />
        <ul className="mt-10 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.slug} className="bg-background">
              <Link href={`/categories/${c.slug}`} className="group flex h-full flex-col p-6 hover:bg-surface">
                <span className="flex items-center justify-between font-serif text-2xl group-hover:text-accent">
                  {c.name}
                  <ArrowRight aria-hidden className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                {c.description && <span className="mt-2 text-sm leading-relaxed text-muted">{c.description}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </PageContainer>

      {/* 6 · Stories */}
      {stories.length > 0 && (
        <PageContainer as="section" width="wide" className="mt-24" aria-labelledby="stories-title">
          <SectionHeading id="stories-title" eyebrow="Long reads" title="Stories from the city" action={{ href: "/stories", label: "All stories" }} />
          <ul className="mt-10 space-y-14">
            {stories.map((s) => (
              <li key={s.id}>
                <Reveal>
                  <StoryCard story={s} />
                </Reveal>
              </li>
            ))}
          </ul>
        </PageContainer>
      )}

      {/* 7 · Neighbourhoods */}
      {neighbourhoods.length > 0 && (
        <PageContainer as="section" width="wide" className="mt-24" aria-labelledby="neighbourhoods-title">
          <SectionHeading id="neighbourhoods-title" eyebrow="Around town" title="From every corner of Chennai" />
          <ul className="mt-8 flex flex-wrap gap-3">
            {neighbourhoods.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/people?neighbourhood=${n.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm hover:border-foreground hover:bg-surface"
                >
                  {n.name}
                </Link>
              </li>
            ))}
          </ul>
        </PageContainer>
      )}

      {/* 8 · Take part */}
      <PageContainer as="section" width="wide" className="mt-24" aria-labelledby="take-part-title">
        <div className="grid overflow-hidden rounded-sm bg-terracotta text-white md:grid-cols-2">
          <div className="p-8 md:p-14">
            <h2 id="take-part-title" className="display-md">Know someone we should meet?</h2>
            <p className="mt-4 max-w-md leading-relaxed text-white/90">
              Tell us about yourself, or nominate a neighbour, teacher or friend. An editor reads every message, and nothing is
              published without the person’s consent.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-3 p-8 pt-0 md:p-14 md:pt-14">
            <Link href="/submit" className={buttonStyles({ variant: "primary", size: "lg" })}>
              Share your story
            </Link>
            <Link
              href="/nominate"
              className={buttonStyles({ variant: "outline", size: "lg", className: "border-white text-white hover:bg-white hover:text-terracotta" })}
            >
              Nominate someone
            </Link>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
