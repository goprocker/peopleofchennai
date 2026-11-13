import Link from "next/link";
import type { StorySummary } from "@/types/domain";
import { ImageFallback, MediaImage } from "@/components/ui/media-image";
import { SampleBadge } from "@/components/ui/sample-badge";
import { formatDate } from "@/lib/utils";

export function StoryCard({ story, headingLevel: H = "h3" }: { story: StorySummary; headingLevel?: "h2" | "h3" }) {
  return (
    <article className="group relative grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center">
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-surface-sunk">
        {story.cover ? (
          <MediaImage image={story.cover} className="portrait-tone" sizes="(min-width: 640px) 40vw, 100vw" />
        ) : (
          <ImageFallback label={story.title} />
        )}
        {story.isSample && !story.cover?.isSample && <SampleBadge className="absolute top-3 left-3" />}
      </div>
      <div>
        <p className="eyebrow text-muted">
          {story.person ? story.person.fullName : "Story"}
          {story.publishedAt && (
            <>
              {" · "}
              <time dateTime={story.publishedAt}>{formatDate(story.publishedAt)}</time>
            </>
          )}
        </p>
        <H className="mt-2 font-serif text-3xl leading-tight">
          <Link href={`/stories/${story.slug}`} className="after:absolute after:inset-0 group-hover:text-accent">
            {story.title}
          </Link>
        </H>
        {story.excerpt && <p className="mt-3 leading-relaxed text-muted">{story.excerpt}</p>}
      </div>
    </article>
  );
}
