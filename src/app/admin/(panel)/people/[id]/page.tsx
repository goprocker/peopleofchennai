import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButtonForm, RecordConsentForm } from "@/components/admin/consent-forms";
import { PublicationControls } from "@/components/admin/publication-controls";
import { AdminHeader, formatDateTime, Panel, StatusBadge } from "@/components/admin/ui";
import { dbFail } from "@/lib/admin/db";
import { allowedTransitions, transitionPermission, type PublicationStatus } from "@/lib/admin/publication";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { publicMediaUrl } from "@/lib/db/mappers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordConsent, withdrawConsent } from "../../submissions/actions";
import { saveProfile, transitionProfile } from "../actions";
import { ProfileEditor, type ProfileFormValues } from "./profile-editor";

export const metadata = { title: "Edit profile" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECTION_COLUMNS = {
  storyIntroduction: "story_introduction",
  storyBackground: "story_background",
  storyJourney: "story_journey",
  storyChallenges: "story_challenges",
  storyAchievements: "story_achievements",
  storyChennai: "story_chennai",
  storyAspirations: "story_aspirations",
} as const;

export default async function EditProfilePage({ params }: PageProps<"/admin/people/[id]">) {
  const session = await requirePagePermission("profiles.view");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const db = await createSupabaseServerClient();
  const [profileRes, catsRes, hoodsRes, mediaRes] = await Promise.all([
    db
      .from("profiles")
      .select(
        `*, categories:profile_categories(category_id), gallery:profile_media(media_id, display_order),
         links:social_links(platform, url, display_order), interview:interview_answers(question, answer, display_order),
         consents:consent_records(id, consent_type, consent_status, consent_version, subject_reference, evidence_reference, recorded_at),
         submission:submissions!submissions_converted_profile_id_fkey(id)`,
      )
      .eq("id", id)
      .maybeSingle(),
    db.from("categories").select("id, name").order("display_order"),
    db.from("neighbourhoods").select("id, name").order("name"),
    db
      .from("media_assets")
      .select("id, original_filename, storage_path, alt_text")
      .eq("bucket", "public-media")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (profileRes.error) dbFail("load_profile", profileRes.error);
  const p = profileRes.data;
  if (!p) notFound();

  type Ordered = { display_order: number };
  const byOrder = (a: Ordered, b: Ordered) => a.display_order - b.display_order;
  const values: ProfileFormValues = {
    fullName: p.full_name,
    slug: p.slug,
    headline: p.headline,
    shortBio: p.short_bio ?? "",
    longBio: p.long_bio ?? "",
    pullQuote: p.pull_quote ?? "",
    sections: Object.fromEntries(Object.entries(SECTION_COLUMNS).map(([k, col]) => [k, p[col] ?? ""])),
    neighbourhoodId: p.neighbourhood_id ?? "",
    portraitMediaId: p.portrait_media_id ?? "",
    featured: p.featured,
    categoryIds: (p.categories ?? []).map((c: { category_id: string }) => c.category_id),
    galleryMediaIds: [...(p.gallery ?? [])].sort(byOrder).map((g: { media_id: string }) => g.media_id),
    links: [...(p.links ?? [])].sort(byOrder).map(({ platform, url }) => ({ platform, url })),
    interview: [...(p.interview ?? [])].sort(byOrder).map(({ question, answer }) => ({ question, answer })),
  };

  const status = p.publication_status as PublicationStatus;
  const transitions = allowedTransitions(status)
    .filter((a) => can(session.role, transitionPermission("profiles", a)))
    .map((kind) => ({ kind, action: transitionProfile.bind(null, p.id, kind) }));
  const consents = [...(p.consents ?? [])].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
  const hasGrantedConsent = consents.some(
    (c) => c.consent_status === "granted" && ["publication", "nominee_publication"].includes(c.consent_type),
  );
  const submissionId: string | undefined = Array.isArray(p.submission)
    ? p.submission[0]?.id
    : p.submission?.id;

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/people", label: "People" }}
        title={p.full_name}
        description={
          <>
            Updated {formatDateTime(p.updated_at)}
            {p.published_at && <> · first published {formatDateTime(p.published_at)}</>}
            {p.is_sample && " · sample data"}
          </>
        }
        actions={
          <>
            <StatusBadge status={status} />
            {status === "published" && (
              <Link href={`/people/${p.slug}`} className="text-sm underline underline-offset-4">
                View live →
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ProfileEditor
          action={saveProfile.bind(null, p.id)}
          values={values}
          readOnly={!can(session.role, "profiles.edit")}
          categories={(catsRes.data ?? []).map((c) => ({ id: c.id, label: c.name }))}
          neighbourhoods={(hoodsRes.data ?? []).map((n) => ({ id: n.id, label: n.name }))}
          media={(mediaRes.data ?? []).map((m) => ({
            id: m.id,
            label: m.alt_text || m.original_filename,
            url: publicMediaUrl(m.storage_path),
          }))}
        />

        <div className="space-y-6">
          <Panel title="Publication">
            {!hasGrantedConsent && !p.is_sample && (
              <p className="bg-terracotta/10 text-terracotta-dark mb-3 rounded-sm p-3 text-sm">
                No granted publication consent is on record, so publishing will be refused.
              </p>
            )}
            <PublicationControls actions={transitions} />
          </Panel>

          <Panel title="Consent">
            {consents.length ? (
              <ul className="mb-5 space-y-3 text-sm">
                {consents.map((c) => (
                  <li key={c.id} className="border-border rounded-sm border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={c.consent_status} />
                      <span className="font-medium">{c.consent_type.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-muted mt-1 break-words">{c.evidence_reference}</p>
                    <p className="text-muted text-xs">{formatDateTime(c.recorded_at)}</p>
                    {c.consent_status === "granted" && can(session.role, "consent.record") && (
                      <div className="mt-2">
                        <ConfirmButtonForm
                          action={withdrawConsent.bind(null, c.id)}
                          label="Mark withdrawn"
                          successMessage="Withdrawn. The profile was unpublished."
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mb-4 text-sm">No consent recorded.</p>
            )}
            {can(session.role, "consent.record") && (
              <RecordConsentForm
                action={recordConsent}
                profileId={p.id}
                submissionId={submissionId}
                defaultSubject={p.full_name}
              />
            )}
          </Panel>

          {submissionId && (
            <Panel>
              <Link
                href={`/admin/submissions/${submissionId}`}
                className="text-sm underline underline-offset-4"
              >
                Original submission →
              </Link>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
