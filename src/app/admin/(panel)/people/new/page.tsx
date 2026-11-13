import { AdminHeader, Panel } from "@/components/admin/ui";
import { requirePagePermission } from "@/lib/auth/session";
import { NewNamedItemForm } from "@/components/admin/new-named-item-form";
import { createProfile } from "../actions";

export const metadata = { title: "New profile" };

export default async function NewProfilePage() {
  await requirePagePermission("profiles.edit");
  return (
    <>
      <AdminHeader back={{ href: "/admin/people", label: "People" }} title="New profile" />
      <Panel className="max-w-md">
        <p className="text-muted mb-4 text-sm">
          Start with a name. The profile is created as an unpublished draft.
        </p>
        <NewNamedItemForm
          action={createProfile}
          name="fullName"
          label="Full name"
          submitLabel="Create draft"
        />
      </Panel>
    </>
  );
}
