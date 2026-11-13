import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createSupabasePublicClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type PeopleQuery } from "@/lib/validation/query";
import {
  PROFILE_SUMMARY_SELECT,
  STORY_SUMMARY_SELECT,
  one,
  toCategory,
  toImage,
  toNeighbourhood,
  toPersonSummary,
  toSections,
  toStorySummary,
  type MediaRow,
  type ProfileSummaryRow,
  type StorySummaryRow,
} from "@/lib/db/mappers";
import {
  sampleCategories,
  sampleFeaturedSlugs,
  sampleNeighbourhoods,
  samplePeople,
  sampleStories,
} from "@/lib/db/sample-data";
import type {
  Category,
  Neighbourhood,
  Paginated,
  PersonDetail,
  PersonSummary,
  RichTextNode,
  SocialPlatform,
  StoryDetail,
  StorySummary,
} from "@/types/domain";

/**
 * Public read layer. Every query uses the cookie-less anon client, so RLS limits it to
 * published content; we also filter on publication_status explicitly as defence in depth.
 * When Supabase isn't configured, the bundled (fictional, labelled) sample data is used.
 */

function fail(op: string, error: { message: string; code?: string }): never {
  logger.error("db.public_read_failed", { op, code: error.code, message: error.message });
  throw new AppError("INTERNAL", "We couldn't load this right now. Please try again.");
}

const paginate = <T,>(items: T[], page: number, pageSize: number, total: number): Paginated<T> => ({
  items,
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

const summarise = ({ id, slug, fullName, headline, shortBio, categories, neighbourhood, portrait, isSample, publishedAt }: PersonDetail): PersonSummary =>
  ({ id, slug, fullName, headline, shortBio, categories, neighbourhood, portrait, isSample, publishedAt });

const storySummary = ({ id, slug, title, excerpt, cover, person, isSample, publishedAt }: StoryDetail): StorySummary =>
  ({ id, slug, title, excerpt, cover, person, isSample, publishedAt });

// ───────────────────────── Taxonomy ─────────────────────────

export const listCategories = cache(async (): Promise<Category[]> => {
  if (!isSupabaseConfigured) return sampleCategories;
  const { data, error } = await createSupabasePublicClient()
    .from("categories")
    .select("id, name, slug, description, display_order")
    .eq("active", true)
    .order("display_order")
    .order("name");
  if (error) fail("listCategories", error);
  return data.map(toCategory);
});

export const getCategory = cache(async (slug: string): Promise<Category | null> =>
  (await listCategories()).find((c) => c.slug === slug) ?? null,
);

export const listNeighbourhoods = cache(async (): Promise<Neighbourhood[]> => {
  if (!isSupabaseConfigured) return sampleNeighbourhoods;
  const { data, error } = await createSupabasePublicClient()
    .from("neighbourhoods")
    .select("id, name, slug")
    .eq("active", true)
    .order("name");
  if (error) fail("listNeighbourhoods", error);
  return data.map(toNeighbourhood);
});

// ───────────────────────── People ─────────────────────────

async function profilesByIds(ids: string[]): Promise<PersonSummary[]> {
  if (ids.length === 0) return [];
  const { data, error } = await createSupabasePublicClient()
    .from("profiles")
    .select(PROFILE_SUMMARY_SELECT)
    .in("id", ids)
    .eq("publication_status", "published");
  if (error) fail("profilesByIds", error);
  const byId = new Map((data as unknown as ProfileSummaryRow[]).map((r) => [r.id, toPersonSummary(r)]));
  // Preserve the order the caller ranked them in.
  return ids.flatMap((id) => byId.get(id) ?? []);
}

function samplePeopleSearch(query: PeopleQuery, pageSize: number): Paginated<PersonSummary> {
  const terms = (query.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  let rows = samplePeople.filter((p) => {
    if (query.category && !p.categories.some((c) => c.slug === query.category)) return false;
    if (query.neighbourhood && p.neighbourhood?.slug !== query.neighbourhood) return false;
    if (terms.length === 0) return true;
    const hay = [p.fullName, p.headline, p.shortBio, p.neighbourhood?.name, ...p.categories.map((c) => c.name)]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
  rows = [...rows].sort((a, b) =>
    query.sort === "name"
      ? a.fullName.localeCompare(b.fullName)
      : (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
  const start = (query.page - 1) * pageSize;
  return paginate(rows.slice(start, start + pageSize).map(summarise), query.page, pageSize, rows.length);
}

export async function listPeople(query: PeopleQuery, pageSize = PAGE_SIZE): Promise<Paginated<PersonSummary>> {
  if (!isSupabaseConfigured) return samplePeopleSearch(query, pageSize);
  const { data, error } = await createSupabasePublicClient().rpc("search_people", {
    p_q: query.q ?? null,
    p_category: query.category ?? null,
    p_neighbourhood: query.neighbourhood ?? null,
    p_sort: query.sort,
    p_limit: pageSize,
    p_offset: (query.page - 1) * pageSize,
  });
  if (error) fail("listPeople", error);
  const rows = (data ?? []) as { id: string; total: number }[];
  // An out-of-range page returns no rows, so no total either; report 0 and let the page show "no results".
  const total = rows.length ? Number(rows[0].total) : 0;
  return paginate(await profilesByIds(rows.map((r) => r.id)), query.page, pageSize, total);
}

interface ProfileDetailRow extends ProfileSummaryRow {
  long_bio: string;
  pull_quote: string | null;
  updated_at: string;
  gallery: { caption: string | null; display_order: number; media: MediaRow | MediaRow[] | null }[] | null;
  interview: { question: string; answer: string; display_order: number }[] | null;
  links: { platform: SocialPlatform; url: string; display_order: number }[] | null;
  [column: string]: unknown;
}

const PROFILE_DETAIL_SELECT = `
  ${PROFILE_SUMMARY_SELECT},
  long_bio, pull_quote, updated_at,
  story_introduction, story_background, story_journey, story_challenges,
  story_achievements, story_chennai, story_aspirations,
  gallery:profile_media(caption, display_order, media:media_assets(storage_path, alt_text, width, height, bucket)),
  interview:interview_answers(question, answer, display_order),
  links:social_links(platform, url, display_order)
`;

const byOrder = (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order;

export const getPerson = cache(async (slug: string): Promise<PersonDetail | null> => {
  if (!isSupabaseConfigured) return samplePeople.find((p) => p.slug === slug) ?? null;
  const { data, error } = await createSupabasePublicClient()
    .from("profiles")
    .select(PROFILE_DETAIL_SELECT)
    .eq("slug", slug)
    .eq("publication_status", "published")
    .maybeSingle();
  if (error) fail("getPerson", error);
  if (!data) return null;
  const r = data as unknown as ProfileDetailRow;
  return {
    ...toPersonSummary(r),
    longBio: r.long_bio,
    pullQuote: r.pull_quote,
    updatedAt: r.updated_at,
    sections: toSections(r),
    interview: [...(r.interview ?? [])].sort(byOrder).map(({ question, answer }) => ({ question, answer })),
    links: [...(r.links ?? [])].sort(byOrder).map(({ platform, url }) => ({ platform, url })),
    gallery: [...(r.gallery ?? [])].sort(byOrder).flatMap((g) => {
      const img = toImage(one(g.media));
      return img ? [{ ...img, caption: g.caption }] : [];
    }),
  };
});

/** People sharing a category (preferred) or neighbourhood with the given person. */
export async function listRelatedPeople(person: PersonSummary, limit = 3): Promise<PersonSummary[]> {
  const catSlugs = new Set(person.categories.map((c) => c.slug));
  const score = (p: PersonSummary) =>
    p.categories.filter((c) => catSlugs.has(c.slug)).length * 2 +
    (person.neighbourhood && p.neighbourhood?.slug === person.neighbourhood.slug ? 1 : 0);

  let pool: PersonSummary[];
  if (!isSupabaseConfigured) {
    pool = samplePeople.map(summarise);
  } else {
    const { data, error } = await createSupabasePublicClient()
      .from("profiles")
      .select(PROFILE_SUMMARY_SELECT)
      .eq("publication_status", "published")
      .neq("id", person.id)
      .order("published_at", { ascending: false })
      .limit(40);
    if (error) fail("listRelatedPeople", error);
    pool = (data as unknown as ProfileSummaryRow[]).map(toPersonSummary);
  }
  return pool
    .filter((p) => p.id !== person.id)
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || (b.p.publishedAt ?? "").localeCompare(a.p.publishedAt ?? ""))
    .slice(0, limit)
    .map(({ p }) => p);
}

export const listFeaturedPeople = cache(async (limit = 3): Promise<PersonSummary[]> => {
  if (!isSupabaseConfigured) {
    return sampleFeaturedSlugs.flatMap((s) => samplePeople.find((p) => p.slug === s) ?? []).slice(0, limit).map(summarise);
  }
  const { data, error } = await createSupabasePublicClient()
    .from("profiles")
    .select(PROFILE_SUMMARY_SELECT)
    .eq("publication_status", "published")
    .eq("featured", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) fail("listFeaturedPeople", error);
  return (data as unknown as ProfileSummaryRow[]).map(toPersonSummary);
});

export const listRecentPeople = cache(async (limit = 6): Promise<PersonSummary[]> =>
  (await listPeople({ sort: "recent", page: 1 }, limit)).items,
);

/** Slugs of every published profile, for sitemap / generateStaticParams. */
export async function listPublishedPersonSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  if (!isSupabaseConfigured) return samplePeople.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt }));
  const { data, error } = await createSupabasePublicClient()
    .from("profiles")
    .select("slug, updated_at")
    .eq("publication_status", "published");
  if (error) fail("listPublishedPersonSlugs", error);
  return data.map((r) => ({ slug: r.slug as string, updatedAt: r.updated_at as string }));
}

// ───────────────────────── Stories ─────────────────────────

export async function listStories(page = 1, pageSize = PAGE_SIZE): Promise<Paginated<StorySummary>> {
  if (!isSupabaseConfigured) {
    const sorted = [...sampleStories].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    const start = (page - 1) * pageSize;
    return paginate(sorted.slice(start, start + pageSize).map(storySummary), page, pageSize, sorted.length);
  }
  const from = (page - 1) * pageSize;
  const { data, error, count } = await createSupabasePublicClient()
    .from("stories")
    .select(STORY_SUMMARY_SELECT, { count: "exact" })
    .eq("publication_status", "published")
    .order("published_at", { ascending: false })
    .range(from, from + pageSize - 1);
  // PostgREST returns 416 (PGRST103) for an offset past the end; treat as an empty page.
  if (error?.code === "PGRST103") return paginate([], page, pageSize, count ?? 0);
  if (error) fail("listStories", error);
  return paginate((data as unknown as StorySummaryRow[]).map(toStorySummary), page, pageSize, count ?? 0);
}

export const listFeaturedStories = cache(async (limit = 2): Promise<StorySummary[]> => {
  if (!isSupabaseConfigured) return sampleStories.slice(0, limit).map(storySummary);
  const { data, error } = await createSupabasePublicClient()
    .from("stories")
    .select(STORY_SUMMARY_SELECT)
    .eq("publication_status", "published")
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) fail("listFeaturedStories", error);
  return (data as unknown as StorySummaryRow[]).map(toStorySummary);
});

export const getStory = cache(async (slug: string): Promise<StoryDetail | null> => {
  if (!isSupabaseConfigured) return sampleStories.find((s) => s.slug === slug) ?? null;
  const { data, error } = await createSupabasePublicClient()
    .from("stories")
    .select(`${STORY_SUMMARY_SELECT}, body_json, updated_at`)
    .eq("slug", slug)
    .eq("publication_status", "published")
    .maybeSingle();
  if (error) fail("getStory", error);
  if (!data) return null;
  const r = data as unknown as StorySummaryRow & { body_json: RichTextNode; updated_at: string };
  return { ...toStorySummary(r), body: r.body_json, updatedAt: r.updated_at };
});

/** Published stories about a given person (shown on their profile). */
export async function listStoriesForPerson(personSlug: string, limit = 3): Promise<StorySummary[]> {
  if (!isSupabaseConfigured) {
    return sampleStories.filter((s) => s.person?.slug === personSlug).slice(0, limit).map(storySummary);
  }
  const { data, error } = await createSupabasePublicClient()
    .from("stories")
    .select(`${STORY_SUMMARY_SELECT.replace("person:profiles(", "person:profiles!inner(")}`)
    .eq("publication_status", "published")
    .eq("person.slug", personSlug)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) fail("listStoriesForPerson", error);
  return (data as unknown as StorySummaryRow[]).map(toStorySummary);
}

export async function listPublishedStorySlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  if (!isSupabaseConfigured) return sampleStories.map((s) => ({ slug: s.slug, updatedAt: s.updatedAt }));
  const { data, error } = await createSupabasePublicClient()
    .from("stories")
    .select("slug, updated_at")
    .eq("publication_status", "published");
  if (error) fail("listPublishedStorySlugs", error);
  return data.map((r) => ({ slug: r.slug as string, updatedAt: r.updated_at as string }));
}
