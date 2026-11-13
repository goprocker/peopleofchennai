"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { dbFail } from "@/lib/admin/db";
import {
  allowedTransitions,
  TRANSITIONS,
  transitionPatch,
  transitionPermission,
  type PublicationStatus,
  type TransitionAction,
} from "@/lib/admin/publication";
import { requirePermission } from "@/lib/auth/session";
import { AppError, runAction, type ActionResult } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uniqueSlug } from "@/lib/utils";
import { profileSchema } from "@/lib/validation/admin";

const id = z.uuid();
const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

function revalidatePublicPerson(slugs: (string | null | undefined)[]) {
  revalidatePath("/");
  revalidatePath("/people");
  revalidatePath("/(site)/categories/[slug]", "page");
  for (const s of slugs) if (s) revalidatePath(`/people/${s}`);
  revalidatePath("/sitemap.xml");
}

/** Parse the profile editor form (repeated fields use getAll). */
function parseProfileForm(form: FormData) {
  const questions = form.getAll("interviewQuestion").map(str);
  const answers = form.getAll("interviewAnswer").map(str);
  const platforms = form.getAll("linkPlatform").map(str);
  const urls = form.getAll("linkUrl").map(str);
  return profileSchema.parse({
    fullName: form.get("fullName"),
    slug: form.get("slug"),
    headline: form.get("headline"),
    shortBio: str(form.get("shortBio")),
    longBio: str(form.get("longBio")),
    pullQuote: str(form.get("pullQuote")),
    storyIntroduction: str(form.get("storyIntroduction")),
    storyBackground: str(form.get("storyBackground")),
    storyJourney: str(form.get("storyJourney")),
    storyChallenges: str(form.get("storyChallenges")),
    storyAchievements: str(form.get("storyAchievements")),
    storyChennai: str(form.get("storyChennai")),
    storyAspirations: str(form.get("storyAspirations")),
    neighbourhoodId: str(form.get("neighbourhoodId")),
    portraitMediaId: str(form.get("portraitMediaId")),
    featured: form.get("featured") === "on",
    categoryIds: form.getAll("categoryIds").map(str).filter(Boolean),
    galleryMediaIds: form.getAll("galleryMediaIds").map(str).filter(Boolean),
    links: platforms.map((platform, i) => ({ platform, url: urls[i]?.trim() ?? "" })).filter((l) => l.url),
    interview: questions
      .map((question, i) => ({ question, answer: answers[i] ?? "" }))
      .filter((qa) => qa.question.trim() || qa.answer.trim()),
  });
}

export async function createProfile(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const session = await requirePermission("profiles.edit");
    const fullName = z.string().trim().min(2, "Enter a name.").max(120).parse(form.get("fullName"));
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("profiles")
      .insert({
        full_name: fullName,
        slug: uniqueSlug(fullName),
        headline: "Draft profile",
        created_by: session.userId,
        updated_by: session.userId,
      })
      .select("id")
      .single();
    if (error) dbFail("create_profile", error);
    await audit(session, "profile.create", "profile", data.id);
    return data.id as string;
  });
  if (!result.ok) return result;
  redirect(`/admin/people/${result.data}`);
}

export async function saveProfile(
  profileId: string,
  _p: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("profiles.edit");
    const pid = id.parse(profileId);
    const input = parseProfileForm(form);
    const db = await createSupabaseServerClient();

    const { data: before, error: loadErr } = await db.from("profiles").select("slug").eq("id", pid).single();
    if (loadErr) dbFail("load_profile", loadErr);

    const { error } = await db
      .from("profiles")
      .update({
        full_name: input.fullName,
        slug: input.slug,
        headline: input.headline,
        short_bio: input.shortBio,
        long_bio: input.longBio,
        pull_quote: input.pullQuote,
        story_introduction: input.storyIntroduction,
        story_background: input.storyBackground,
        story_journey: input.storyJourney,
        story_challenges: input.storyChallenges,
        story_achievements: input.storyAchievements,
        story_chennai: input.storyChennai,
        story_aspirations: input.storyAspirations,
        neighbourhood_id: input.neighbourhoodId,
        portrait_media_id: input.portraitMediaId,
        featured: input.featured,
        updated_by: session.userId,
      })
      .eq("id", pid);
    if (error) dbFail("save_profile", error);

    // Replace child rows. Not one transaction; each step is idempotent, so re-saving repairs a partial failure.
    const clear = await Promise.all([
      db.from("profile_categories").delete().eq("profile_id", pid),
      db.from("profile_media").delete().eq("profile_id", pid),
      db.from("social_links").delete().eq("profile_id", pid),
      db.from("interview_answers").delete().eq("profile_id", pid),
    ]);
    const clearErr = clear.find((r) => r.error)?.error;
    if (clearErr) dbFail("clear_profile_children", clearErr);

    const inserts = await Promise.all([
      input.categoryIds.length
        ? db
            .from("profile_categories")
            .insert(input.categoryIds.map((category_id) => ({ profile_id: pid, category_id })))
        : null,
      input.galleryMediaIds.length
        ? db
            .from("profile_media")
            .insert(
              input.galleryMediaIds.map((media_id, i) => ({ profile_id: pid, media_id, display_order: i })),
            )
        : null,
      input.links.length
        ? db
            .from("social_links")
            .insert(input.links.map((l, i) => ({ profile_id: pid, ...l, display_order: i })))
        : null,
      input.interview.length
        ? db
            .from("interview_answers")
            .insert(input.interview.map((qa, i) => ({ profile_id: pid, ...qa, display_order: i })))
        : null,
    ]);
    const insErr = inserts.find((r) => r?.error)?.error;
    if (insErr) dbFail("insert_profile_children", insErr);

    await audit(session, "profile.update", "profile", pid, { slugChanged: before.slug !== input.slug });
    revalidatePath(`/admin/people/${pid}`);
    revalidatePublicPerson([before.slug, input.slug]);
    return undefined;
  });
}

export async function transitionProfile(
  profileId: string,
  action: TransitionAction,
  _p: ActionResult | null,
  _f: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!(action in TRANSITIONS)) throw new AppError("VALIDATION", "Unknown action.");
    const session = await requirePermission(transitionPermission("profiles", action));
    const pid = id.parse(profileId);
    const db = await createSupabaseServerClient();
    const { data: p, error: loadErr } = await db
      .from("profiles")
      .select("slug, publication_status, published_at")
      .eq("id", pid)
      .single();
    if (loadErr) dbFail("load_profile", loadErr);
    if (!allowedTransitions(p.publication_status as PublicationStatus).includes(action)) {
      throw new AppError(
        "CONFLICT",
        `Can’t ${TRANSITIONS[action].label.toLowerCase()} from “${p.publication_status}”.`,
      );
    }
    // The DB trigger rejects publishing without granted consent (CONSENT_REQUIRED).
    const { error } = await db
      .from("profiles")
      .update({ ...transitionPatch(action, p.published_at), updated_by: session.userId })
      .eq("id", pid);
    if (error) dbFail("transition_profile", error);

    if (action === "publish") {
      await db.from("submissions").update({ review_status: "published" }).eq("converted_profile_id", pid);
    }
    if (action === "unpublish" || action === "archive") {
      // Stories about this person must not stay live without their profile.
      const { error: sErr } = await db
        .from("stories")
        .update({ publication_status: "unpublished" })
        .eq("profile_id", pid)
        .eq("publication_status", "published");
      if (sErr) dbFail("unpublish_linked_stories", sErr);
      revalidatePath("/stories");
      revalidatePath("/(site)/stories/[slug]", "page");
    }
    await audit(session, `profile.${action}`, "profile", pid, { from: p.publication_status });
    revalidatePath(`/admin/people/${pid}`);
    revalidatePath("/admin/people");
    revalidatePublicPerson([p.slug]);
    return undefined;
  });
}
