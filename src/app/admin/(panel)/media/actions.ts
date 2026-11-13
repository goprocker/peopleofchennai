"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { dbFail } from "@/lib/admin/db";
import { requirePermission } from "@/lib/auth/session";
import { AppError, runAction, type ActionResult } from "@/lib/errors";
import { processUploadedImage } from "@/lib/services/images";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mediaUpdateSchema } from "@/lib/validation/admin";

const BUCKET = "public-media";
const monthPath = (ext: string) => `library/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;

export async function uploadMedia(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("media.manage");
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("VALIDATION", "Choose an image to upload.", {
        file: ["Choose an image to upload."],
      });
    }
    const { altText } = mediaUpdateSchema.parse({ altText: form.get("altText") ?? "" });
    let image;
    try {
      image = await processUploadedImage(file);
    } catch (err) {
      // Re-key the shared photo error onto this form's field.
      if (err instanceof AppError) throw new AppError(err.code, err.message, { file: [err.message] });
      throw err;
    }

    const db = await createSupabaseServerClient();
    const path = monthPath(image.ext);
    const up = await db.storage
      .from(BUCKET)
      .upload(path, image.buffer, { contentType: image.mime, upsert: false });
    if (up.error) dbFail("upload_media", up.error);
    const { data, error } = await db
      .from("media_assets")
      .insert({
        bucket: BUCKET,
        storage_path: path,
        original_filename: file.name.slice(0, 255) || `image.${image.ext}`,
        mime_type: image.mime,
        file_size: image.size,
        width: image.width,
        height: image.height,
        alt_text: altText,
        uploaded_by: session.userId,
      })
      .select("id")
      .single();
    if (error) {
      await db.storage.from(BUCKET).remove([path]);
      dbFail("insert_media", error);
    }
    await audit(session, "media.upload", "media", data.id);
    revalidatePath("/admin/media");
    return undefined;
  });
}

export async function updateMediaAlt(
  mediaId: string,
  _p: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("media.manage");
    const mid = z.uuid().parse(mediaId);
    const { altText } = mediaUpdateSchema.parse({ altText: form.get("altText") ?? "" });
    const db = await createSupabaseServerClient();
    const { error } = await db.from("media_assets").update({ alt_text: altText }).eq("id", mid);
    if (error) dbFail("update_media", error);
    await audit(session, "media.update", "media", mid);
    revalidatePath("/admin/media");
    revalidatePath("/", "layout");
    return undefined;
  });
}

export async function deleteMedia(
  mediaId: string,
  _p: ActionResult | null,
  _f: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("media.manage");
    const mid = z.uuid().parse(mediaId);
    const db = await createSupabaseServerClient();
    const { data: m, error: loadErr } = await db
      .from("media_assets")
      .select("bucket, storage_path")
      .eq("id", mid)
      .single();
    if (loadErr) dbFail("load_media", loadErr);
    // profile_media uses ON DELETE RESTRICT, so a gallery image in use fails here (23503).
    const { error } = await db.from("media_assets").delete().eq("id", mid);
    if (error?.code === "23503")
      throw new AppError("CONFLICT", "This image is in a profile gallery. Remove it there first.");
    if (error) dbFail("delete_media", error);
    if (!m.storage_path.startsWith("sample/")) await db.storage.from(m.bucket).remove([m.storage_path]);
    await audit(session, "media.delete", "media", mid);
    revalidatePath("/admin/media");
    revalidatePath("/", "layout");
    return undefined;
  });
}

/**
 * Copy a submitted photo from the private bucket into the public library. Requires a granted
 * photo consent on the submission. Uses the service role only for the cross-bucket copy.
 */
export async function promoteSubmissionPhoto(
  submissionId: string,
  _p: ActionResult | null,
  _f: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const session = await requirePermission("media.manage");
    const sid = z.uuid().parse(submissionId);
    const db = await createSupabaseServerClient();
    const { data: s, error } = await db
      .from("submissions")
      .select(
        "submitter_name, nominee_name, photo:media_assets(*), consents:consent_records(consent_type, consent_status)",
      )
      .eq("id", sid)
      .single();
    if (error) dbFail("load_submission", error);
    const photo = Array.isArray(s.photo) ? s.photo[0] : s.photo;
    if (!photo) throw new AppError("NOT_FOUND", "This submission has no photo.");
    const photoConsent = (s.consents ?? []).some(
      (c: { consent_type: string; consent_status: string }) =>
        c.consent_type === "photo" && c.consent_status === "granted",
    );
    if (!photoConsent) throw new AppError("CONSENT_REQUIRED", "Record a granted photo consent first.");

    const ext = photo.storage_path.split(".").pop() ?? "jpg";
    const path = monthPath(ext);
    const copy = await createSupabaseAdminClient()
      .storage.from("submission-uploads")
      .copy(photo.storage_path, path, { destinationBucket: BUCKET });
    if (copy.error) dbFail("copy_photo", copy.error);
    const { data, error: insErr } = await db
      .from("media_assets")
      .insert({
        bucket: BUCKET,
        storage_path: path,
        original_filename: photo.original_filename,
        mime_type: photo.mime_type,
        file_size: photo.file_size,
        width: photo.width,
        height: photo.height,
        alt_text: `Portrait of ${s.nominee_name ?? s.submitter_name}`.slice(0, 300),
        uploaded_by: session.userId,
      })
      .select("id")
      .single();
    if (insErr) {
      await createSupabaseAdminClient().storage.from(BUCKET).remove([path]);
      dbFail("insert_promoted_media", insErr);
    }
    await audit(session, "media.promote", "media", data.id, { submissionId: sid });
    revalidatePath("/admin/media");
  });
  return result.ok
    ? { ok: true, message: "Copied to the media library. You can now pick it as a portrait." }
    : result;
}
