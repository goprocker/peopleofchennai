"use client";

import { ActionForm, AdminField } from "./action-form";
import type { ActionResult } from "@/lib/errors";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

/** Record consent evidence against a submission and/or profile. */
export function RecordConsentForm({
  action,
  submissionId,
  profileId,
  defaultSubject,
}: {
  action: Action;
  submissionId?: string;
  profileId?: string;
  defaultSubject: string;
}) {
  return (
    <ActionForm action={action} submitLabel="Record consent" successMessage="Consent recorded.">
      {({ fieldError }) => (
        <>
          {submissionId && <input type="hidden" name="submissionId" value={submissionId} />}
          {profileId && <input type="hidden" name="profileId" value={profileId} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField
              as="select"
              label="Type"
              name="consentType"
              defaultValue="publication"
              options={[
                { value: "publication", label: "Publication" },
                { value: "photo", label: "Photo" },
                { value: "nominee_publication", label: "Nominee publication" },
              ]}
              error={fieldError("consentType")}
            />
            <AdminField
              as="select"
              label="Status"
              name="consentStatus"
              defaultValue="granted"
              options={[
                { value: "granted", label: "Granted" },
                { value: "requested", label: "Requested" },
                { value: "declined", label: "Declined" },
                { value: "withdrawn", label: "Withdrawn" },
              ]}
              error={fieldError("consentStatus")}
            />
          </div>
          <AdminField
            label="Whose consent"
            name="subjectReference"
            defaultValue={defaultSubject}
            required
            error={fieldError("subjectReference")}
          />
          <AdminField
            label="Evidence"
            name="evidenceReference"
            hint="Where the proof lives, for example “Email reply 14 Nov, saved in shared inbox”."
            required
            error={fieldError("evidenceReference")}
          />
        </>
      )}
    </ActionForm>
  );
}

export function ConfirmButtonForm({
  action,
  label,
  pendingLabel,
  successMessage,
  variant = "outline",
}: {
  action: Action;
  label: string;
  pendingLabel?: string;
  successMessage?: string;
  variant?: "primary" | "accent" | "outline" | "ghost";
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={label}
      pendingLabel={pendingLabel}
      successMessage={successMessage}
      submitVariant={variant}
      className="space-y-2"
    >
      {() => null}
    </ActionForm>
  );
}
