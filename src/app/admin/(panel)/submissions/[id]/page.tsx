import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButtonForm, RecordConsentForm } from "@/components/admin/consent-forms";
import { AdminHeader, formatDateTime, Panel, StatusBadge } from "@/components/admin/ui";
import { dbFail } from "@/lib/admin/db";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addSubmissionNote,
  convertToDraft,
  recordConsent,
  setSubmissionStatus,
  withdrawConsent,
} from "../actions";
import { promoteSubmissionPhoto } from "../../media/actions";
import { NoteForm, StatusForm } from "./forms";

export const metadata = { title: "Submission" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SubmissionDetail({ params }: PageProps<"/admin/submissions/[id]">) {
  const session = await requirePagePermission("submissions.view");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const db = await createSupabaseServerClient();
  const { data: s, error } = await db
    .from("submissions")
    .select(
      `*, category:categories(name), neighbourhood:neighbourhoods(name),
       photo:media_assets(storage_path, width, height),
       notes:editorial_notes(id, note, created_at, editor_id),
       consents:consent_records(id, consent_type, consent_status, consent_version, subject_reference, evidence_reference, recorded_at, withdrawn_at)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) dbFail("load_submission", error);
  if (!s) notFound();

  // Private bucket: short-lived signed URL, only rendered for staff.
  let photoUrl: string | null = null;
  if (s.photo?.storage_path) {
    const signed = await db.storage.from("submission-uploads").createSignedUrl(s.photo.storage_path, 600);
    photoUrl = signed.data?.signedUrl ?? null;
  }

  const isNomination = s.submission_type === "nomination";
  const person = isNomination ? s.nominee_name : s.submitter_name;
  const notes = [...(s.notes ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const consents = [...(s.consents ?? [])].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
  const links: string[] = Array.isArray(s.social_links) ? s.social_links : [];

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/submissions", label: "Submissions" }}
        title={person}
        description={
          <>
            {isNomination ? `Nominated by ${s.submitter_name}` : "Self submission"} · received{" "}
            {formatDateTime(s.created_at)}
          </>
        }
        actions={<StatusBadge status={s.review_status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Panel title="Story">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-semibold">
                  {isNomination ? "Why they should be featured" : "Introduction"}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap">{s.story_pitch}</dd>
              </div>
              {!isNomination && s.story_details && (
                <div>
                  <dt className="font-semibold">Their story</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{s.story_details}</dd>
                </div>
              )}
              {s.why_it_matters && (
                <div>
                  <dt className="font-semibold">Why it matters</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{s.why_it_matters}</dd>
                </div>
              )}
            </dl>
          </Panel>

          <Panel title="Editorial notes">
            {notes.length ? (
              <ol className="mb-5 space-y-3 text-sm">
                {notes.map((n) => (
                  <li key={n.id} className="bg-surface-sunk/60 rounded-sm p-3">
                    <p className="whitespace-pre-wrap">{n.note}</p>
                    <p className="text-muted mt-1 text-xs">
                      {n.editor_id === session.userId ? "You" : "Editor"} · {formatDateTime(n.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted mb-4 text-sm">No notes yet.</p>
            )}
            <NoteForm action={addSubmissionNote.bind(null, s.id)} />
          </Panel>

          <Panel title="Consent">
            <p className="text-muted mb-4 text-sm">
              Nothing is published without granted consent from the person featured.
              {isNomination && " Nominees have not consented yet: contact them and record their answer here."}
            </p>
            {consents.length > 0 && (
              <ul className="mb-6 space-y-3 text-sm">
                {consents.map((c) => (
                  <li key={c.id} className="border-border rounded-sm border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={c.consent_status} />
                      <span className="font-medium">{c.consent_type.replace(/_/g, " ")}</span>
                      <span className="text-muted text-xs">v{c.consent_version}</span>
                    </div>
                    <p className="text-muted mt-1 break-words">
                      {c.subject_reference} · {c.evidence_reference}
                    </p>
                    <p className="text-muted text-xs">Recorded {formatDateTime(c.recorded_at)}</p>
                    {c.consent_status === "granted" && can(session.role, "consent.record") && (
                      <div className="mt-2">
                        <ConfirmButtonForm
                          action={withdrawConsent.bind(null, c.id)}
                          label="Mark withdrawn"
                          successMessage="Consent withdrawn."
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {can(session.role, "consent.record") && (
              <RecordConsentForm
                action={recordConsent}
                submissionId={s.id}
                profileId={s.converted_profile_id ?? undefined}
                defaultSubject={isNomination ? `nominee:${s.nominee_name}` : `submitter:${s.submitter_email}`}
              />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Review">
            <StatusForm action={setSubmissionStatus.bind(null, s.id)} current={s.review_status} />
          </Panel>

          <Panel title="Profile">
            {s.converted_profile_id ? (
              <Link
                href={`/admin/people/${s.converted_profile_id}`}
                className="text-sm underline underline-offset-4"
              >
                Open the draft profile →
              </Link>
            ) : can(session.role, "submissions.convert") ? (
              <>
                <p className="text-muted mb-3 text-sm">
                  Creates an unpublished draft you can edit. Nothing goes live.
                </p>
                <ConfirmButtonForm
                  action={convertToDraft.bind(null, s.id)}
                  label="Convert to draft profile"
                  pendingLabel="Creating…"
                  variant="primary"
                />
              </>
            ) : (
              <p className="text-muted text-sm">An editor can convert this into a draft profile.</p>
            )}
          </Panel>

          <Panel title="Details">
            <dl className="space-y-2 text-sm">
              <Row label="Submitted by">{s.submitter_name}</Row>
              <Row label="Email">
                <a href={`mailto:${s.submitter_email}`} className="break-all underline underline-offset-4">
                  {s.submitter_email}
                </a>
              </Row>
              {isNomination && <Row label="Nominee contact">{s.nominee_contact || "—"}</Row>}
              <Row label="Category">{s.category?.name ?? "—"}</Row>
              <Row label="Neighbourhood">{s.neighbourhood?.name ?? "—"}</Row>
              {links.length > 0 && (
                <Row label="Links">
                  <ul>
                    {links.map((l) => (
                      <li key={l}>
                        <a
                          href={l}
                          rel="noopener noreferrer nofollow"
                          target="_blank"
                          className="break-all underline"
                        >
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Row>
              )}
            </dl>
          </Panel>

          {photoUrl && (
            <Panel title="Submitted photo">
              {/* Signed private URL; plain img avoids caching it through the image optimiser. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={`Photo submitted for ${person}`} className="w-full rounded-sm" />
              <p className="text-muted mt-2 text-xs">
                Private. {s.photo?.width}×{s.photo?.height}. Link expires in 10 minutes.
              </p>
              {can(session.role, "media.manage") && (
                <div className="mt-3">
                  <ConfirmButtonForm
                    action={promoteSubmissionPhoto.bind(null, s.id)}
                    label="Copy to media library"
                    pendingLabel="Copying…"
                  />
                  <p className="text-muted mt-1 text-xs">Needs a granted photo consent.</p>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted text-xs font-semibold tracking-wide uppercase">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
