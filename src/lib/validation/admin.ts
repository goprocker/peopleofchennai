import { z } from "zod";
import { httpsUrl } from "./public-forms";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.")
  .max(80);
const uuid = z.uuid();
const optionalUuid = z
  .union([uuid, z.literal(""), z.null()])
  .optional()
  .transform((v) => (v ? v : null));
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const SOCIAL_PLATFORMS = ["website", "instagram", "linkedin", "github", "portfolio", "x", "youtube", "other"] as const;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  slug,
  headline: z.string().trim().min(4).max(160),
  shortBio: z.string().trim().max(600).default(""),
  longBio: z.string().trim().max(20000).default(""),
  pullQuote: optionalText(300),
  storyIntroduction: optionalText(5000),
  storyBackground: optionalText(5000),
  storyJourney: optionalText(5000),
  storyChallenges: optionalText(5000),
  storyAchievements: optionalText(5000),
  storyChennai: optionalText(5000),
  storyAspirations: optionalText(5000),
  neighbourhoodId: optionalUuid,
  portraitMediaId: optionalUuid,
  featured: z.boolean().default(false),
  categoryIds: z.array(uuid).max(4).default([]),
  galleryMediaIds: z.array(uuid).max(12).default([]),
  links: z.array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: httpsUrl })).max(8).default([]),
  interview: z
    .array(z.object({ question: z.string().trim().min(4).max(200), answer: z.string().trim().min(1).max(4000) }))
    .max(12)
    .default([]),
});
export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileData = z.output<typeof profileSchema>;

const richTextNode: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.string().max(40),
    text: z.string().max(20000).optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z.array(z.object({ type: z.string().max(40), attrs: z.record(z.string(), z.unknown()).optional() })).optional(),
    content: z.array(richTextNode).max(2000).optional(),
  }),
);

export const storySchema = z.object({
  title: z.string().trim().min(4).max(200),
  slug,
  excerpt: z.string().trim().max(500).default(""),
  body: z.object({ type: z.literal("doc"), content: z.array(richTextNode).max(2000).default([]) }),
  profileId: optionalUuid,
  coverMediaId: optionalUuid,
  featured: z.boolean().default(false),
});
export type StoryInput = z.input<typeof storySchema>;

export const PUBLICATION_ACTIONS = ["save_draft", "submit_review", "publish", "unpublish", "archive"] as const;
export type PublicationAction = (typeof PUBLICATION_ACTIONS)[number];

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug,
  description: optionalText(400),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export const neighbourhoodSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug,
  active: z.boolean().default(true),
});

export const REVIEW_STATUSES = [
  "pending",
  "under_review",
  "awaiting_consent",
  "approved",
  "rejected",
  "published",
] as const;

export const submissionUpdateSchema = z.object({
  reviewStatus: z.enum(REVIEW_STATUSES).optional(),
  note: z.string().trim().min(1).max(4000).optional(),
});

export const consentRecordSchema = z.object({
  consentType: z.enum(["publication", "photo", "nominee_publication"]),
  consentStatus: z.enum(["requested", "granted", "withdrawn", "declined"]),
  subjectReference: z.string().trim().min(2).max(200),
  evidenceReference: z.string().trim().min(4, "Describe where the evidence is stored.").max(1000),
  submissionId: optionalUuid,
  profileId: optionalUuid,
});

export const mediaUpdateSchema = z.object({ altText: z.string().trim().max(300) });

export const settingsSchema = z.object({
  submissionsOpen: z.boolean(),
  consentVersion: z.string().trim().min(1).max(40),
  editorNotificationEmails: z.array(z.email()).max(20),
});

export const editorRoleSchema = z.object({
  email: z.email(),
  role: z.enum(["super_admin", "editor", "reviewer"]),
});
