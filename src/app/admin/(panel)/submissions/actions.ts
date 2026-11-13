"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { dbFail } from "@/lib/admin/db";
import { requirePermission } from "@/lib/auth/session";
import { AppError, runAction, type ActionResult } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { truncate, uniqueSlug } from "@/lib/utils";
import { consentRecordSchema, REVIEW_STATUSES } from "@/lib/validation/admin";

const id = z.uuid();

export async function setSubmissionStatus(
  submissionId: string,
  _p: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("submissions.review");
    const sid = id.parse(submissionId);
    const status = z.enum(REVIEW_STATUSES).parse(form.get("reviewStatus"));
    const db = await createSupabaseServerClient();
    const { error } = await db.from("submissions").update({ review_status: status }).eq("id", sid);
    if (error) dbFail("set_submission_status", error);
    await audit(session, "submission.status", "submission", sid, { status });
    revalidatePath(`/admin/submissions/${sid}`);
    revalidatePath("/admin/submissions");
    return undefined;
  });
}

export async function addSubmissionNote(
  submissionId: string,
  _p: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("submissions.note");
    const sid = id.parse(submissionId);
    const note = z.string().trim().min(1, "Write a note first.").max(4000).parse(form.get("note"));
    const db = await createSupabaseServerClient();
    const { error } = await db
      .from("editorial_notes")
      .insert({ submission_id: sid, editor_id: session.userId, note });
    if (error) dbFail("add_note", error);
    revalidatePath(`/admin/submissions/${sid}`);
    return undefined;
  });
}

export async function recordConsent(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("consent.record");
    const input = consentRecordSchema.parse({
      consentType: form.get("consentType"),
      consentStatus: form.get("consentStatus"),
      subjectReference: form.get("subjectReference"),
      evidenceReference: form.get("evidenceReference"),
      submissionId: form.get("submissionId") || null,
      profileId: form.get("profileId") || null,
    });
    if (!input.submissionId && !input.profileId) throw new AppError("VALIDATION", "Missing consent target.");
    const db = await createSupabaseServerClient();
    const { data: setting } = await db
      .from("site_settings")
      .select("value")
      .eq("key", "consent_version")
      .maybeSingle();
    const { data, error } = await db
      .from("consent_records")
      .insert({
        submission_id: input.submissionId,
        profile_id: input.profileId,
        subject_reference: input.subjectReference,
        consent_type: input.consentType,
        consent_status: input.consentStatus,
        consent_version: typeof setting?.value === "string" ? setting.value : "2026-11-v1",
        evidence_reference: input.evidenceReference,
        withdrawn_at: input.consentStatus === "withdrawn" ? new Date().toISOString() : null,
        recorded_by: session.userId,
      })
      .select("id")
      .single();
    if (error) dbFail("record_consent", error);
    await audit(session, "consent.record", "consent", data.id, {
      type: input.consentType,
      status: input.consentStatus,
      submissionId: input.submissionId,
      profileId: input.profileId,
    });
    if (input.submissionId) revalidatePath(`/admin/submissions/${input.submissionId}`);
    if (input.profileId) {
      revalidatePath(`/admin/people/${input.profileId}`);
      // A withdrawal unpublishes the profile via DB trigger; refresh public pages too.
      if (input.consentStatus === "withdrawn") revalidatePath("/", "layout");
    }
    return undefined;
  });
}

/** Withdraw an existing granted consent record (sets withdrawn_at; the DB trigger unpublishes). */
export async function withdrawConsent(
  recordId: string,
  _p: ActionResult | null,
  _f: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("consent.record");
    const rid = id.parse(recordId);
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("consent_records")
      .update({ consent_status: "withdrawn", withdrawn_at: new Date().toISOString() })
      .eq("id", rid)
      .select("submission_id, profile_id")
      .single();
    if (error) dbFail("withdraw_consent", error);
    await audit(session, "consent.withdraw", "consent", rid, {});
    if (data.submission_id) revalidatePath(`/admin/submissions/${data.submission_id}`);
    if (data.profile_id) revalidatePath(`/admin/people/${data.profile_id}`);
    revalidatePath("/", "layout");
    return undefined;
  });
}

/**
 * Creates a DRAFT profile from a submission. Never publishes. Consent records on the
 * submission are linked to the new profile so the publish guard can see them.
 * The submitted photo stays in the private bucket; editors promote it via Media.
 */
export async function convertToDraft(
  submissionId: string,
  _p: ActionResult | null,
  _f: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const session = await requirePermission("submissions.convert");
    const sid = id.parse(submissionId);
    const db = await createSupabaseServerClient();
    const { data: s, error } = await db.from("submissions").select("*").eq("id", sid).single();
    if (error) dbFail("load_submission", error);
    if (s.converted_profile_id)
      throw new AppError("CONFLICT", "This submission already has a draft profile.");

    const name: string = s.submission_type === "nomination" ? s.nominee_name : s.submitter_name;
    const headline = truncate(String(s.story_pitch).replace(/\s+/g, " "), 160).padEnd(4, ".");
    const { data: profile, error: pErr } = await db
      .from("profiles")
      .insert({
        slug: uniqueSlug(name),
        full_name: name,
        headline,
        short_bio: truncate(s.story_pitch, 600),
        story_introduction: s.story_details ? truncate(s.story_details, 5000) : null,
        story_chennai: s.why_it_matters ? truncate(s.why_it_matters, 5000) : null,
        neighbourhood_id: s.neighbourhood_id,
        publication_status: "draft",
        created_by: session.userId,
        updated_by: session.userId,
      })
      .select("id")
      .single();
    if (pErr) dbFail("create_profile", pErr);

    const steps = await Promise.all([
      s.category_id
        ? db.from("profile_categories").insert({ profile_id: profile.id, category_id: s.category_id })
        : Promise.resolve({ error: null }),
      db.from("consent_records").update({ profile_id: profile.id }).eq("submission_id", sid),
      db
        .from("submissions")
        .update({
          converted_profile_id: profile.id,
          review_status: s.review_status === "pending" ? "approved" : s.review_status,
        })
        .eq("id", sid),
    ]);
    const failed = steps.find((r) => r.error);
    if (failed?.error) dbFail("convert_links", failed.error);

    await audit(session, "submission.convert", "submission", sid, { profileId: profile.id });
    revalidatePath(`/admin/submissions/${sid}`);
    return profile.id as string;
  });
  if (!result.ok) return result;
  redirect(`/admin/people/${result.data}`);
}
