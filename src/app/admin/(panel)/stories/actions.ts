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
import { storySchema } from "@/lib/validation/admin";

const id = z.uuid();

function revalidatePublicStory(slugs: (string | null | undefined)[]) {
  revalidatePath("/");
  revalidatePath("/stories");
  for (const s of slugs) if (s) revalidatePath(`/stories/${s}`);
  revalidatePath("/(site)/people/[slug]", "page");
  revalidatePath("/sitemap.xml");
}

export async function createStory(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const session = await requirePermission("stories.edit");
    const title = z.string().trim().min(4, "Use at least 4 characters.").max(200).parse(form.get("title"));
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("stories")
      .insert({ title, slug: uniqueSlug(title), author_id: session.userId })
      .select("id")
      .single();
    if (error) dbFail("create_story", error);
    await audit(session, "story.create", "story", data.id);
    return data.id as string;
  });
  if (!result.ok) return result;
  redirect(`/admin/stories/${result.data}`);
}

export async function saveStory(
  storyId: string,
  _p: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("stories.edit");
    const sid = id.parse(storyId);
    let body: unknown;
    try {
      body = JSON.parse(String(form.get("body") ?? ""));
    } catch {
      throw new AppError("VALIDATION", "The story body couldn’t be read.", { body: ["Invalid document."] });
    }
    const input = storySchema.parse({
      title: form.get("title"),
      slug: form.get("slug"),
      excerpt: form.get("excerpt") ?? "",
      body,
      profileId: form.get("profileId") || null,
      coverMediaId: form.get("coverMediaId") || null,
      featured: form.get("featured") === "on",
    });
    const db = await createSupabaseServerClient();
    const { data: before, error: loadErr } = await db.from("stories").select("slug").eq("id", sid).single();
    if (loadErr) dbFail("load_story", loadErr);

    const { error } = await db
      .from("stories")
      .update({
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        body_json: input.body,
        profile_id: input.profileId,
        cover_media_id: input.coverMediaId,
        featured: input.featured,
      })
      .eq("id", sid);
    if (error) dbFail("save_story", error);
    await audit(session, "story.update", "story", sid, { slugChanged: before.slug !== input.slug });
    revalidatePath(`/admin/stories/${sid}`);
    revalidatePublicStory([before.slug, input.slug]);
    return undefined;
  });
}

export async function transitionStory(
  storyId: string,
  action: TransitionAction,
  _p: ActionResult | null,
  _f: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!(action in TRANSITIONS)) throw new AppError("VALIDATION", "Unknown action.");
    const session = await requirePermission(transitionPermission("stories", action));
    const sid = id.parse(storyId);
    const db = await createSupabaseServerClient();
    const { data: s, error: loadErr } = await db
      .from("stories")
      .select("slug, publication_status, published_at, is_sample, profile:profiles(publication_status)")
      .eq("id", sid)
      .single();
    if (loadErr) dbFail("load_story", loadErr);
    if (!allowedTransitions(s.publication_status as PublicationStatus).includes(action)) {
      throw new AppError(
        "CONFLICT",
        `Can’t ${TRANSITIONS[action].label.toLowerCase()} from “${s.publication_status}”.`,
      );
    }
    // A story about a person may only go live while that person's profile is published (i.e. consented).
    const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
    if (action === "publish" && profile && profile.publication_status !== "published") {
      throw new AppError("CONSENT_REQUIRED", "Publish the linked profile first. It needs granted consent.");
    }
    const { error } = await db.from("stories").update(transitionPatch(action, s.published_at)).eq("id", sid);
    if (error) dbFail("transition_story", error);
    await audit(session, `story.${action}`, "story", sid, { from: s.publication_status });
    revalidatePath(`/admin/stories/${sid}`);
    revalidatePath("/admin/stories");
    revalidatePublicStory([s.slug]);
    return undefined;
  });
}
