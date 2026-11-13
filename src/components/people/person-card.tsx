import Link from "next/link";
import type { PersonSummary } from "@/types/domain";
import { ImageFallback, MediaImage } from "@/components/ui/media-image";
import { SampleBadge } from "@/components/ui/sample-badge";
import { cn } from "@/lib/utils";

export function PersonCard({
  person,
  size = "default",
  priority,
  headingLevel: H = "h3",
}: {
  person: PersonSummary;
  size?: "default" | "large";
  priority?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const meta = [person.categories[0]?.name, person.neighbourhood?.name].filter(Boolean).join(" · ");
  return (
    <article className="group relative">
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface-sunk">
        {person.portrait ? (
          <MediaImage
            image={person.portrait}
            priority={priority}
            className="portrait-tone"
            sizes={size === "large" ? "(min-width: 768px) 33vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"}
          />
        ) : (
          <ImageFallback label={person.fullName} />
        )}
        {person.isSample && !person.portrait?.isSample && <SampleBadge className="absolute top-3 left-3" />}
      </div>
      <div className="mt-4">
        {meta && <p className="eyebrow text-muted">{meta}</p>}
        <H className={cn("mt-2 font-serif leading-tight", size === "large" ? "text-3xl" : "text-2xl")}>
          {/* Stretched link: the whole card is clickable, but only the name is announced. */}
          <Link href={`/people/${person.slug}`} className="after:absolute after:inset-0 group-hover:text-accent">
            {person.fullName}
          </Link>
        </H>
        <p className="mt-2 leading-relaxed text-muted">{person.headline}</p>
      </div>
    </article>
  );
}

export function PersonGrid({ people, priorityCount = 0 }: { people: PersonSummary[]; priorityCount?: number }) {
  return (
    <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((p, i) => (
        <li key={p.id}>
          <PersonCard person={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
