import { NewNamedItemForm } from "@/components/admin/new-named-item-form";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { requirePagePermission } from "@/lib/auth/session";
import { createStory } from "../actions";

export const metadata = { title: "New story" };

export default async function NewStoryPage() {
  await requirePagePermission("stories.edit");
  return (
    <>
      <AdminHeader back={{ href: "/admin/stories", label: "Stories" }} title="New story" />
      <Panel className="max-w-md">
        <p className="text-muted mb-4 text-sm">
          Start with a working title. The story is created as a draft.
        </p>
        <NewNamedItemForm action={createStory} name="title" label="Title" submitLabel="Create draft" />
      </Panel>
    </>
  );
}
