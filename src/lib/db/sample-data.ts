/**
 * ⚠ DEVELOPMENT FALLBACK ONLY — used when Supabase is not configured.
 * Every person here is FICTIONAL and is rendered with a visible "Sample" label.
 * Mirrors supabase/seed.sql. Once NEXT_PUBLIC_SUPABASE_URL is set, all data comes from Postgres.
 */
import type { Category, Neighbourhood, PersonDetail, StoryDetail } from "@/types/domain";

export const sampleCategories: Category[] = [
  ["Arts & Culture", "arts-culture", "Musicians, dancers, painters and keepers of tradition."],
  ["Founders & Builders", "founders-builders", "People starting things — companies, collectives, movements."],
  ["Students & Researchers", "students-researchers", "Curious minds in classrooms, labs and libraries."],
  ["Creators & Designers", "creators-designers", "Makers of images, interfaces, objects and ideas."],
  ["Community Heroes", "community-heroes", "Volunteers, organisers and quiet helpers."],
  ["Small Businesses", "small-businesses", "Shopkeepers, vendors, artisans and family trades."],
  ["Sports & Performance", "sports-performance", "Athletes, coaches and performers."],
  ["Everyday Chennai", "everyday-chennai", "Ordinary days, extraordinary people."],
].map(([name, slug, description], i) => ({ id: `cat-${slug}`, name, slug, description, displayOrder: i + 1 }));

export const sampleNeighbourhoods: Neighbourhood[] = [
  "Mylapore",
  "Adyar",
  "T. Nagar",
  "Anna Nagar",
  "Velachery",
  "Tambaram",
  "Besant Nagar",
  "Royapettah",
  "Nungambakkam",
  "Triplicane",
].map((name) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { id: `nb-${slug}`, name, slug };
});

const cat = (slug: string) => {
  const c = sampleCategories.find((x) => x.slug === slug)!;
  return { name: c.name, slug: c.slug };
};
const nb = (slug: string) => {
  const n = sampleNeighbourhoods.find((x) => x.slug === slug)!;
  return { name: n.name, slug: n.slug };
};
const portrait = (i: number, tone: string) => ({
  src: `/images/samples/portrait-${i}.svg`,
  alt: `Illustrated placeholder portrait in ${tone} tones`,
  width: 800,
  height: 1000,
  isSample: true,
});
const daysAgo = (d: number) => new Date(Date.UTC(2026, 10, 13 - d)).toISOString();

function person(
  i: number,
  slug: string,
  fullName: string,
  headline: string,
  category: string,
  neighbourhood: string,
  tone: string,
  extra: Partial<PersonDetail> = {},
): PersonDetail {
  return {
    id: `sample-${i}`,
    slug,
    fullName,
    headline,
    shortBio: "Fictional sample profile used for development.",
    longBio: "",
    categories: [cat(category)],
    neighbourhood: nb(neighbourhood),
    portrait: portrait(i, tone),
    isSample: true,
    publishedAt: daysAgo(i * 2),
    updatedAt: daysAgo(i * 2),
    pullQuote: null,
    sections: [{ key: "introduction", title: "Introduction", body: "This is a fictional sample used to preview layouts." }],
    interview: [],
    gallery: [],
    links: [],
    ...extra,
  };
}

export const samplePeople: PersonDetail[] = [
  person(1, "sample-meera-the-veena-teacher", "Meera (Sample)", "A veena teacher who keeps evening classes free for neighbourhood kids", "arts-culture", "mylapore", "terracotta", {
    pullQuote: "Music is the one thing you can give away and still keep.",
    sections: [
      { key: "introduction", title: "Introduction", body: "This is a fictional sample used to preview layouts." },
      { key: "journey", title: "The journey", body: "In this sample story, Meera began teaching after her own teacher retired." },
      { key: "chennai", title: "On Chennai", body: "For this sample, Chennai is the sound of temple bells at dusk." },
    ],
    interview: [
      { question: "How did your journey begin?", answer: "Sample answer: with a borrowed instrument and a patient teacher." },
      { question: "What does Chennai mean to you?", answer: "Sample answer: a city that listens." },
    ],
  }),
  person(2, "sample-arjun-the-repair-shop", "Arjun (Sample)", "Runs a phone repair stall that doubles as a free coding corner", "small-businesses", "t-nagar", "sage", {
    pullQuote: "Everything broken is just a puzzle with a deadline.",
  }),
  person(3, "sample-kavya-the-marine-researcher", "Kavya (Sample)", "Counts sea turtle nests on early-morning beach walks", "students-researchers", "besant-nagar", "sand", {
    pullQuote: "The sea keeps its own calendar. We just try to read it.",
  }),
  person(4, "sample-rahim-the-tea-stall", "Rahim (Sample)", "Thirty years of tea and the best conversations on the street", "everyday-chennai", "triplicane", "ink"),
  person(5, "sample-divya-the-type-designer", "Divya (Sample)", "Designs Tamil typefaces for screens", "creators-designers", "adyar", "terracotta and sand"),
  person(6, "sample-sanjay-the-kabaddi-coach", "Sanjay (Sample)", "Coaches a kabaddi team that practises under streetlights", "sports-performance", "tambaram", "sage and ink"),
];

export const sampleFeaturedSlugs = samplePeople.slice(0, 3).map((p) => p.slug);

export const sampleStories: StoryDetail[] = [
  {
    id: "sample-story-1",
    slug: "sample-terrace-music-room",
    title: "The terrace room where music is free",
    excerpt: "A fictional sample story used to preview the long-form layout.",
    cover: portrait(1, "terracotta"),
    person: { slug: samplePeople[0].slug, fullName: samplePeople[0].fullName, categories: samplePeople[0].categories, neighbourhood: samplePeople[0].neighbourhood },
    isSample: true,
    publishedAt: daysAgo(2),
    updatedAt: daysAgo(2),
    body: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "This is a fictional sample story for development. Replace it with real, consented editorial content before launch." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Evenings" }] },
        { type: "paragraph", content: [{ type: "text", text: "Sample paragraph describing an evening class." }] },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Music is the one thing you can give away and still keep." }] }] },
      ],
    },
  },
  {
    id: "sample-story-2",
    slug: "sample-turtle-walks",
    title: "Before sunrise, on the turtle walk",
    excerpt: "A fictional sample story used to preview the long-form layout.",
    cover: portrait(3, "sand"),
    person: { slug: samplePeople[2].slug, fullName: samplePeople[2].fullName, categories: samplePeople[2].categories, neighbourhood: samplePeople[2].neighbourhood },
    isSample: true,
    publishedAt: daysAgo(6),
    updatedAt: daysAgo(6),
    body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "This is a fictional sample story for development." }] }] },
  },
];
