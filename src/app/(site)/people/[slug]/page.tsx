import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { EditorialDivider } from "@/components/layout/editorial-divider";
import { PageContainer } from "@/components/layout/page-container";
import { SectionHeading } from "@/components/layout/section-heading";
import { PersonGrid } from "@/components/people/person-card";
import { StoryCard } from "@/components/stories/story-card";
import { ImageFallback, MediaImage } from "@/components/ui/media-image";
import { SampleBadge } from "@/components/ui/sample-badge";
import { getPerson, listPublishedPersonSlugs, listRelatedPeople, listStoriesForPerson } from "@/lib/db/public";
import { formatDate } from "@/lib/utils";
import type { SocialPlatform } from "@/types/domain";

export const revalidate = 300;
type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return (await listPublishedPersonSlugs()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const person = await getPerson((await params).slug);
  if (!person) return { title: "Not found" };
  return {
    title: person.fullName,
    description: person.headline,
    alternates: { canonical: `/people/${person.slug}` },
    openGraph: { type: "profile", title: person.fullName, description: person.headline },
    robots: person.isSample ? { index: false } : undefined,
  };
}

const platformLabel: Record<SocialPlatform, string> = {
  website: "Website",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  github: "GitHub",
  portfolio: "Portfolio",
  x: "X",
  youtube: "YouTube",
  other: "Link",
};

export default async function PersonPage({ params }: { params: Params }) {
  const person = await getPerson((await params).slug);
  if (!person) notFound();
  const [related, stories] = await Promise.all([listRelatedPeople(person, 3), listStoriesForPerson(person.slug, 2)]);

  return (
    <article>
      <PageContainer width="wide" className="pt-10 md:pt-16">
        <div className="grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface-sunk md:sticky md:top-28 md:self-start">
            {person.portrait ? (
              <MediaImage image={person.portrait} priority sizes="(min-width: 768px) 45vw, 100vw" />
            ) : (
              <ImageFallback label={person.fullName} />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              {person.categories.map((c) => (
                <Link key={c.slug} href={`/categories/${c.slug}`} className="eyebrow text-accent hover:underline">
                  {c.name}
                </Link>
              ))}
              {person.neighbourhood && (
                <Link href={`/people?neighbourhood=${person.neighbourhood.slug}`} className="eyebrow text-muted hover:underline">
                  {person.neighbourhood.name}
                </Link>
              )}
              {person.isSample && <SampleBadge />}
            </div>
            <h1 className="display-lg mt-5">{person.fullName}</h1>
            <p className="mt-5 font-serif text-2xl leading-snug text-muted md:text-3xl">{person.headline}</p>

            {person.longBio && <p className="prose-editorial mt-8">{person.longBio}</p>}

            {person.pullQuote && (
              <Reveal>
                <blockquote className="my-12 border-l-2 border-terracotta pl-6 font-serif text-3xl leading-snug italic">
                  “{person.pullQuote}”
                </blockquote>
              </Reveal>
            )}

            <div className="mt-10 space-y-12">
              {person.sections.map((s) => (
                <section key={s.key} aria-labelledby={`section-${s.key}`}>
                  <h2 id={`section-${s.key}`} className="eyebrow text-accent">{s.title}</h2>
                  <div className="prose-editorial mt-4 space-y-4">
                    {s.body.split(/\n{2,}/).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {person.interview.length > 0 && (
              <section aria-labelledby="interview-title" className="mt-16">
                <EditorialDivider variant="kolam" className="mb-10" />
                <h2 id="interview-title" className="display-md">In conversation</h2>
                <dl className="mt-8 space-y-8">
                  {person.interview.map((qa, i) => (
                    <div key={i}>
                      <dt className="font-semibold">{qa.question}</dt>
                      <dd className="prose-editorial mt-2 text-muted">{qa.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {person.gallery.length > 0 && (
              <section aria-labelledby="gallery-title" className="mt-16">
                <h2 id="gallery-title" className="eyebrow text-accent">Gallery</h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {person.gallery.map((g) => (
                    <li key={g.src}>
                      <figure>
                        <MediaImage image={g} fill={false} sizes="(min-width: 768px) 25vw, 100vw" className="rounded-sm" />
                        {g.caption && <figcaption className="mt-2 text-sm text-muted">{g.caption}</figcaption>}
                      </figure>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {person.links.length > 0 && (
              <section aria-labelledby="links-title" className="mt-12">
                <h2 id="links-title" className="eyebrow text-accent">Find {person.fullName.replace(/\s*\(.*\)$/, "")} online</h2>
                <ul className="mt-4 flex flex-wrap gap-3">
                  {person.links.map((l) => (
                    <li key={l.url}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm hover:border-foreground"
                      >
                        {platformLabel[l.platform]}
                        <ArrowUpRight aria-hidden className="size-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="mt-12 text-sm text-muted">
              {person.publishedAt && (
                <>
                  Published <time dateTime={person.publishedAt}>{formatDate(person.publishedAt)}</time>.{" "}
                </>
              )}
              Something wrong, or want this taken down?{" "}
              <Link href="/contact?subject=correction" className="underline underline-offset-4 hover:text-accent">
                Tell us
              </Link>
              .
            </p>
          </div>
        </div>
      </PageContainer>

      {stories.length > 0 && (
        <PageContainer as="section" width="wide" className="mt-24" aria-labelledby="person-stories-title">
          <SectionHeading id="person-stories-title" eyebrow="Read more" title="Stories" />
          <ul className="mt-10 space-y-14">
            {stories.map((s) => (
              <li key={s.id}>
                <StoryCard story={s} />
              </li>
            ))}
          </ul>
        </PageContainer>
      )}

      {related.length > 0 && (
        <PageContainer as="section" width="wide" className="mt-24" aria-labelledby="related-title">
          <SectionHeading id="related-title" eyebrow="Keep exploring" title="You might also like to meet" />
          <div className="mt-10">
            <PersonGrid people={related} />
          </div>
        </PageContainer>
      )}
    </article>
  );
}
