import { publicEnv } from "@/lib/env";
import type {
  Category,
  Neighbourhood,
  PersonSummary,
  PublicImage,
  RichTextNode,
  StorySection,
  StorySummary,
} from "@/types/domain";

/** Resolve a public-media storage path to a URL. "sample/…" paths are bundled dev placeholders. */
export function publicMediaUrl(storagePath: string): string {
  if (storagePath.startsWith("sample/")) return `/images/samples/${storagePath.slice("sample/".length)}`;
  const base = publicEnv.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/storage/v1/object/public/public-media/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
}

export interface MediaRow {
  storage_path: string;
  alt_text: string;
  width: number;
  height: number;
  bucket?: string;
}

export function toImage(row: MediaRow | null | undefined): PublicImage | null {
  if (!row) return null;
  // Never expose private-bucket media through public mappers.
  if (row.bucket && row.bucket !== "public-media") return null;
  return {
    src: publicMediaUrl(row.storage_path),
    alt: row.alt_text,
    width: row.width,
    height: row.height,
    isSample: row.storage_path.startsWith("sample/"),
  };
}

type One<T> = T | T[] | null | undefined;
export const one = <T,>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export interface ProfileSummaryRow {
  id: string;
  slug: string;
  full_name: string;
  headline: string;
  short_bio: string;
  is_sample: boolean;
  published_at: string | null;
  neighbourhood: One<{ name: string; slug: string }>;
  portrait: One<MediaRow>;
  categories: { category: One<{ name: string; slug: string; display_order?: number }> }[] | null;
}

export const PROFILE_SUMMARY_SELECT = `
  id, slug, full_name, headline, short_bio, is_sample, published_at,
  neighbourhood:neighbourhoods(name, slug),
  portrait:media_assets!profiles_portrait_media_id_fkey(storage_path, alt_text, width, height, bucket),
  categories:profile_categories(category:categories(name, slug, display_order))
`;

export function toPersonSummary(r: ProfileSummaryRow): PersonSummary {
  return {
    id: r.id,
    slug: r.slug,
    fullName: r.full_name,
    headline: r.headline,
    shortBio: r.short_bio,
    isSample: r.is_sample,
    publishedAt: r.published_at,
    neighbourhood: one(r.neighbourhood),
    portrait: toImage(one(r.portrait)),
    categories: (r.categories ?? [])
      .map((c) => one(c.category))
      .filter((c): c is { name: string; slug: string; display_order?: number } => Boolean(c))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map(({ name, slug }) => ({ name, slug })),
  };
}

export const SECTION_TITLES: [key: string, column: string, title: string][] = [
  ["introduction", "story_introduction", "Introduction"],
  ["background", "story_background", "Where it began"],
  ["journey", "story_journey", "The journey"],
  ["challenges", "story_challenges", "Challenges"],
  ["achievements", "story_achievements", "What they've built"],
  ["chennai", "story_chennai", "On Chennai"],
  ["aspirations", "story_aspirations", "What's next"],
];

export function toSections(row: Record<string, unknown>): StorySection[] {
  return SECTION_TITLES.flatMap(([key, col, title]) => {
    const body = row[col];
    return typeof body === "string" && body.trim() ? [{ key, title, body }] : [];
  });
}

export interface StorySummaryRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  is_sample: boolean;
  published_at: string | null;
  cover: One<MediaRow>;
  person: One<{
    slug: string;
    full_name: string;
    publication_status?: string;
    neighbourhood: One<{ name: string; slug: string }>;
    categories: { category: One<{ name: string; slug: string }> }[] | null;
  }>;
}

export const STORY_SUMMARY_SELECT = `
  id, slug, title, excerpt, is_sample, published_at,
  cover:media_assets!stories_cover_media_id_fkey(storage_path, alt_text, width, height, bucket),
  person:profiles(slug, full_name, publication_status,
    neighbourhood:neighbourhoods(name, slug),
    categories:profile_categories(category:categories(name, slug)))
`;

export function toStorySummary(r: StorySummaryRow): StorySummary {
  const p = one(r.person);
  // Only link to a person whose profile is itself published.
  const person =
    p && (p.publication_status === undefined || p.publication_status === "published")
      ? {
          slug: p.slug,
          fullName: p.full_name,
          neighbourhood: one(p.neighbourhood),
          categories: (p.categories ?? [])
            .map((c) => one(c.category))
            .filter((c): c is { name: string; slug: string } => Boolean(c)),
        }
      : null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    isSample: r.is_sample,
    publishedAt: r.published_at,
    cover: toImage(one(r.cover)),
    person,
  };
}

export const toCategory = (r: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
}): Category => ({ id: r.id, name: r.name, slug: r.slug, description: r.description, displayOrder: r.display_order });

export const toNeighbourhood = (r: { id: string; name: string; slug: string }): Neighbourhood => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
});

export function plainTextFromDoc(node: RichTextNode | undefined, max = 300): string {
  if (!node) return "";
  const parts: string[] = [];
  const walk = (n: RichTextNode) => {
    if (n.text) parts.push(n.text);
    n.content?.forEach(walk);
  };
  walk(node);
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, max);
}
