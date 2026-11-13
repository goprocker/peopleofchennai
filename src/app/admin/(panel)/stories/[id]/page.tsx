import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicationControls } from "@/components/admin/publication-controls";
import { AdminHeader, formatDateTime, Panel, StatusBadge } from "@/components/admin/ui";
import { dbFail } from "@/lib/admin/db";
import { allowedTransitions, transitionPermission, type PublicationStatus } from "@/lib/admin/publication";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveStory, transitionStory } from "../actions";
import { StoryEditor } from "./story-editor";

export const metadata = { title: "Edit story" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditStoryPage({ params }: PageProps<"/admin/stories/[id]">) {
  const session = await requirePagePermission("stories.view");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const db = await createSupabaseServerClient();
  const [storyRes, profilesRes, mediaRes] = await Promise.all([
    db
      .from("stories")
      .select("*, profile:profiles(full_name, publication_status)")
      .eq("id", id)
      .maybeSingle(),
    db
      .from("profiles")
      .select("id, full_name, publication_status")
      .neq("publication_status", "archived")
      .order("full_name")
      .limit(500),
    db
      .from("media_assets")
      .select("id, original_filename, alt_text")
      .eq("bucket", "public-media")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (storyRes.error) dbFail("load_story", storyRes.error);
  const s = storyRes.data;
  if (!s) notFound();

  const status = s.publication_status as PublicationStatus;
  const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
  const transitions = allowedTransitions(status)
    .filter((a) => can(session.role, transitionPermission("stories", a)))
    .map((kind) => ({ kind, action: transitionStory.bind(null, s.id, kind) }));

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/stories", label: "Stories" }}
        title={s.title}
        description={
          <>
            Updated {formatDateTime(s.updated_at)}
            {s.published_at && <> · first published {formatDateTime(s.published_at)}</>}
          </>
        }
        actions={
          <>
            <StatusBadge status={status} />
            {status === "published" && (
              <Link href={`/stories/${s.slug}`} className="text-sm underline underline-offset-4">
                View live →
              </Link>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <StoryEditor
          action={saveStory.bind(null, s.id)}
          readOnly={!can(session.role, "stories.edit")}
          values={{
            title: s.title,
            slug: s.slug,
            excerpt: s.excerpt ?? "",
            body: s.body_json,
            profileId: s.profile_id ?? "",
            coverMediaId: s.cover_media_id ?? "",
            featured: s.featured,
          }}
          profiles={(profilesRes.data ?? []).map((p) => ({
            id: p.id,
            label:
              p.publication_status === "published" ? p.full_name : `${p.full_name} (${p.publication_status})`,
          }))}
          media={(mediaRes.data ?? []).map((m) => ({ id: m.id, label: m.alt_text || m.original_filename }))}
        />
        <Panel title="Publication">
          {profile && profile.publication_status !== "published" && (
            <p className="bg-terracotta/10 text-terracotta-dark mb-3 rounded-sm p-3 text-sm">
              {profile.full_name}’s profile isn’t published, so this story can’t be published yet.
            </p>
          )}
          <PublicationControls actions={transitions} />
        </Panel>
      </div>
    </>
  );
}
