import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProcessedImage } from "./images";
import type { contactSchema, nominationSchema, submissionSchema } from "@/lib/validation/public-forms";
import type { z } from "zod";

type Submission = z.output<typeof submissionSchema>;
type Nomination = z.output<typeof nominationSchema>;
type Contact = z.output<typeof contactSchema>;

const FALLBACK_CONSENT_VERSION = "2026-11-v1";
const UPLOAD_BUCKET = "submission-uploads";

/**
 * Inbound writes use the service-role client: anon has no insert rights on private tables.
 * Every caller has already validated input and passed bot + rate-limit checks.
 */
function db(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Submissions are temporarily unavailable. Please try again later.",
    );
  }
  return createSupabaseAdminClient();
}

function fail(op: string, error: { message: string }): never {
  logger.error("intake_db_error", { op, message: error.message });
  throw new AppError("INTERNAL", "We couldn’t save that just now. Please try again.");
}

/** Editors can pause public submissions and nominations from Settings. */
async function assertSubmissionsOpen(client: SupabaseClient) {
  const { data } = await client
    .from("site_settings")
    .select("value")
    .eq("key", "submissions_open")
    .maybeSingle();
  if (data?.value === false) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "We’re not taking new submissions right now. Please check back soon.",
    );
  }
}

async function consentVersion(client: SupabaseClient): Promise<string> {
  const { data } = await client
    .from("site_settings")
    .select("value")
    .eq("key", "consent_version")
    .maybeSingle();
  return typeof data?.value === "string" ? data.value : FALLBACK_CONSENT_VERSION;
}

/** Map optional taxonomy slugs to ids; unknown or inactive slugs become null rather than erroring. */
async function resolveTaxonomy(client: SupabaseClient, categorySlug?: string, neighbourhoodSlug?: string) {
  const [cat, hood] = await Promise.all([
    categorySlug
      ? client.from("categories").select("id").eq("slug", categorySlug).eq("active", true).maybeSingle()
      : null,
    neighbourhoodSlug
      ? client
          .from("neighbourhoods")
          .select("id")
          .eq("slug", neighbourhoodSlug)
          .eq("active", true)
          .maybeSingle()
      : null,
  ]);
  return {
    category_id: (cat?.data?.id as string | undefined) ?? null,
    neighbourhood_id: (hood?.data?.id as string | undefined) ?? null,
  };
}

async function storePhoto(
  client: SupabaseClient,
  image: ProcessedImage,
  originalName: string,
): Promise<string> {
  const path = `submissions/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${image.ext}`;
  const up = await client.storage.from(UPLOAD_BUCKET).upload(path, image.buffer, {
    contentType: image.mime,
    upsert: false,
  });
  if (up.error) fail("upload_photo", up.error);

  const { data, error } = await client
    .from("media_assets")
    .insert({
      bucket: UPLOAD_BUCKET,
      storage_path: path,
      original_filename: (originalName || `photo.${image.ext}`).slice(0, 255),
      mime_type: image.mime,
      file_size: image.size,
      width: image.width,
      height: image.height,
    })
    .select("id")
    .single();
  if (error) {
    await client.storage.from(UPLOAD_BUCKET).remove([path]);
    fail("insert_media", error);
  }
  return data.id as string;
}

/** Best-effort rollback so a half-written submission never lingers. */
async function rollback(client: SupabaseClient, submissionId: string | null, mediaId: string | null) {
  if (submissionId) await client.from("submissions").delete().eq("id", submissionId);
  if (mediaId) {
    const { data } = await client
      .from("media_assets")
      .delete()
      .eq("id", mediaId)
      .select("storage_path")
      .maybeSingle();
    if (data?.storage_path) await client.storage.from(UPLOAD_BUCKET).remove([data.storage_path as string]);
  }
}

export async function createSelfSubmission(
  input: Submission,
  photo: { image: ProcessedImage; name: string } | null,
  evidence: string,
): Promise<string> {
  const client = db();
  await assertSubmissionsOpen(client);
  const [taxonomy, version] = await Promise.all([
    resolveTaxonomy(client, input.categorySlug, input.neighbourhoodSlug),
    consentVersion(client),
  ]);
  const mediaId = photo ? await storePhoto(client, photo.image, photo.name) : null;

  let submissionId: string | null = null;
  try {
    const { data, error } = await client
      .from("submissions")
      .insert({
        submission_type: "self",
        submitter_name: input.fullName,
        submitter_email: input.email,
        ...taxonomy,
        story_pitch: input.introduction,
        story_details: input.story,
        why_it_matters: input.whyItMatters || null,
        social_links: input.socialLinks.map((l) => l.url),
        photo_media_id: mediaId,
      })
      .select("id")
      .single();
    if (error) fail("insert_submission", error);
    submissionId = data.id as string;

    const consents = [
      { consent_type: "publication" as const },
      ...(mediaId ? [{ consent_type: "photo" as const }] : []),
    ].map((c) => ({
      ...c,
      submission_id: submissionId,
      subject_reference: `submitter:${input.email}`.slice(0, 200),
      consent_version: version,
      consent_status: "granted" as const,
      evidence_reference: evidence,
    }));
    const consentRes = await client.from("consent_records").insert(consents);
    if (consentRes.error) fail("insert_consent", consentRes.error);
    return submissionId;
  } catch (err) {
    await rollback(client, submissionId, mediaId);
    throw err;
  }
}

export async function createNomination(input: Nomination, evidence: string): Promise<string> {
  const client = db();
  await assertSubmissionsOpen(client);
  const [taxonomy, version] = await Promise.all([
    resolveTaxonomy(client, input.categorySlug, input.neighbourhoodSlug),
    consentVersion(client),
  ]);

  let submissionId: string | null = null;
  try {
    const { data, error } = await client
      .from("submissions")
      .insert({
        submission_type: "nomination",
        submitter_name: input.nominatorName,
        submitter_email: input.nominatorEmail,
        nominee_name: input.nomineeName,
        nominee_contact: input.nomineeContact || null,
        ...taxonomy,
        story_pitch: input.reason.slice(0, 600),
        story_details: input.reason,
      })
      .select("id")
      .single();
    if (error) fail("insert_nomination", error);
    submissionId = data.id as string;

    // The nominee hasn't consented to anything yet: record it as requested, never granted.
    const consentRes = await client.from("consent_records").insert({
      submission_id: submissionId,
      subject_reference: `nominee:${input.nomineeName}`.slice(0, 200),
      consent_type: "nominee_publication",
      consent_version: version,
      consent_status: "requested",
      evidence_reference: evidence,
    });
    if (consentRes.error) fail("insert_consent", consentRes.error);
    return submissionId;
  } catch (err) {
    await rollback(client, submissionId, null);
    throw err;
  }
}

export async function createContactMessage(input: Contact): Promise<string> {
  const client = db();
  const { data, error } = await client
    .from("contact_messages")
    .insert({ name: input.name, email: input.email, subject: input.subject, message: input.message })
    .select("id")
    .single();
  if (error) fail("insert_contact", error);
  return data.id as string;
}
