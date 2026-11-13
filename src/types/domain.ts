// Public-facing DTOs. These never contain private fields (emails, consent, notes, author ids).

export type PublicationStatus = "draft" | "in_review" | "published" | "unpublished" | "archived";
export type ReviewStatus =
  | "pending"
  | "under_review"
  | "awaiting_consent"
  | "approved"
  | "rejected"
  | "published";
export type EditorRole = "super_admin" | "editor" | "reviewer";
export type SocialPlatform =
  | "website"
  | "instagram"
  | "linkedin"
  | "github"
  | "portfolio"
  | "x"
  | "youtube"
  | "other";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
}

export interface Neighbourhood {
  id: string;
  name: string;
  slug: string;
}

export interface PublicImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  isSample: boolean;
}

export interface PersonSummary {
  id: string;
  slug: string;
  fullName: string;
  headline: string;
  shortBio: string;
  categories: Pick<Category, "name" | "slug">[];
  neighbourhood: Pick<Neighbourhood, "name" | "slug"> | null;
  portrait: PublicImage | null;
  isSample: boolean;
  publishedAt: string | null;
}

export interface StorySection {
  key: string;
  title: string;
  body: string;
}

export interface InterviewAnswer {
  question: string;
  answer: string;
}

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface PersonDetail extends PersonSummary {
  longBio: string;
  pullQuote: string | null;
  sections: StorySection[];
  interview: InterviewAnswer[];
  gallery: (PublicImage & { caption: string | null })[];
  links: SocialLink[];
  updatedAt: string;
}

export interface StorySummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover: PublicImage | null;
  person: Pick<PersonSummary, "slug" | "fullName" | "categories" | "neighbourhood"> | null;
  isSample: boolean;
  publishedAt: string | null;
}

export interface RichTextNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichTextNode[];
}

export interface StoryDetail extends StorySummary {
  body: RichTextNode;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
