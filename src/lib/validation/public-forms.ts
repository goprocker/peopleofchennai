import { z } from "zod";

/**
 * Schemas shared by the browser (React Hook Form) and the server (route handlers).
 * The server always re-validates; client validation is only a convenience.
 */

const name = z.string().trim().min(2, "Please enter at least 2 characters.").max(120, "Too long.");
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")).pipe(z.string().max(254));
const optionalSlug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(80)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .pipe(z.url({ protocol: /^https$/, message: "Use a full https:// link." }));

/** Anti-bot fields included in every public form. */
export const botFields = z.object({
  // Any value fails server-side in assertHuman() with a generic message (no hint to bots).
  website_hp: z.string().max(1000).optional().default(""),
  startedAt: z.coerce.number().int().positive(),
  turnstileToken: z.string().max(4096).optional(),
});

const checkboxTrue = (message: string) =>
  z.union([z.literal(true), z.literal("true"), z.literal("on")], { message }).transform(() => true as const);

export const socialLinksField = z
  .array(z.object({ url: httpsUrl }))
  .max(5, "Up to 5 links.")
  .default([]);

export const submissionSchema = z
  .object({
    fullName: name,
    email,
    categorySlug: optionalSlug,
    neighbourhoodSlug: optionalSlug,
    introduction: z.string().trim().min(10, "Tell us a little more (10+ characters).").max(600),
    story: z.string().trim().min(100, "Please share at least 100 characters.").max(10000),
    whyItMatters: z.string().trim().max(2000).optional().default(""),
    socialLinks: socialLinksField,
    publicationConsent: checkboxTrue("Consent is required to submit."),
    privacyAcknowledged: checkboxTrue("Please acknowledge the privacy notice."),
  })
  .merge(botFields);
export type SubmissionInput = z.input<typeof submissionSchema>;

export const nominationSchema = z
  .object({
    nominatorName: name,
    nominatorEmail: email,
    nomineeName: name,
    reason: z.string().trim().min(30, "Please share at least 30 characters.").max(4000),
    nomineeContact: z.string().trim().max(300).optional().default(""),
    categorySlug: optionalSlug,
    neighbourhoodSlug: optionalSlug,
    permissionConfirmed: checkboxTrue("Please confirm you have permission to share these details."),
  })
  .merge(botFields);
export type NominationInput = z.input<typeof nominationSchema>;

export const CONTACT_SUBJECTS = [
  { value: "general", label: "General question" },
  { value: "correction", label: "Correction to a published story" },
  { value: "removal", label: "Remove my profile or story" },
  { value: "consent_withdrawal", label: "Withdraw my consent" },
  { value: "press", label: "Press & partnerships" },
  { value: "other", label: "Something else" },
] as const;

export const contactSchema = z
  .object({
    name,
    email,
    subject: z.enum(["general", "correction", "removal", "consent_withdrawal", "press", "other"]),
    message: z.string().trim().min(10, "Please write at least 10 characters.").max(5000),
  })
  .merge(botFields);
export type ContactInput = z.input<typeof contactSchema>;

// ───── Image validation (shared constants; the server re-checks bytes with sharp) ─────
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MIN_DIMENSION = 400;
export const IMAGE_MAX_DIMENSION = 8000;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageMime = (typeof IMAGE_TYPES)[number];

export function clientImageCheck(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type as ImageMime)) return "Use a JPEG, PNG or WebP image.";
  if (file.size > IMAGE_MAX_BYTES) return "Images must be 5 MB or smaller.";
  return null;
}
