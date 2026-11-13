import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { RichText } from "@/components/stories/rich-text";
import { MediaImage } from "@/components/ui/media-image";
import { SampleBadge } from "@/components/ui/sample-badge";
import { getStory, listPublishedStorySlugs } from "@/lib/db/public";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;
type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return (await listPublishedStorySlugs()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const story = await getStory((await params).slug);
  if (!story) return { title: "Not found" };
  return {
    title: story.title,
    description: story.excerpt,
    alternates: { canonical: `/stories/${story.slug}` },
    openGraph: { type: "article", title: story.title, description: story.excerpt, publishedTime: story.publishedAt ?? undefined },
    robots: story.isSample ? { index: false } : undefined,
  };
}

export default async function StoryPage({ params }: { params: Params }) {
  const story = await getStory((await params).slug);
  if (!story) notFound();

  return (
    <article className="pt-12 md:pt-20">
      <PageContainer width="narrow">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/stories" className="eyebrow text-accent hover:underline">Stories</Link>
          {story.isSample && <SampleBadge />}
        </div>
        <h1 className="display-lg mt-5 text-balance">{story.title}</h1>
        {story.excerpt && <p className="mt-6 font-serif text-2xl leading-snug text-muted">{story.excerpt}</p>}
        <p className="mt-6 text-sm text-muted">
          {story.publishedAt && <time dateTime={story.publishedAt}>{formatDate(story.publishedAt)}</time>}
          {story.person && (
            <>
              {" · About "}
              <Link href={`/people/${story.person.slug}`} className="font-semibold text-foreground underline-offset-4 hover:underline">
                {story.person.fullName}
              </Link>
            </>
          )}
        </p>
      </PageContainer>

      {story.cover && (
        <PageContainer width="default" className="mt-10">
          <div className="relative aspect-[16/9] overflow-hidden rounded-sm bg-surface-sunk">
            <MediaImage image={story.cover} priority sizes="(min-width: 1152px) 1152px, 100vw" />
          </div>
        </PageContainer>
      )}

      <PageContainer width="narrow" className="mt-12">
        <RichText doc={story.body} />

        {story.person && (
          <Link
            href={`/people/${story.person.slug}`}
            className="group mt-16 flex items-center justify-between gap-4 rounded-sm border border-border p-6 hover:border-foreground"
          >
            <span>
              <span className="eyebrow block text-muted">Meet</span>
              <span className="mt-1 block font-serif text-2xl group-hover:text-accent">{story.person.fullName}</span>
            </span>
            <ArrowRight aria-hidden className="size-5 shrink-0" />
          </Link>
        )}
      </PageContainer>
    </article>
  );
}
