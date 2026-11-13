import { AdminHeader, Panel } from "@/components/admin/ui";
import { dbFail } from "@/lib/admin/db";
import { requirePagePermission } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveCategory, saveNeighbourhood } from "./actions";
import { CategoryForm, NeighbourhoodForm } from "./taxonomy-forms";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requirePagePermission("categories.manage");
  const db = await createSupabaseServerClient();
  const [cats, hoods] = await Promise.all([
    db.from("categories").select("*").order("display_order").order("name"),
    db.from("neighbourhoods").select("*").order("name"),
  ]);
  if (cats.error) dbFail("list_categories", cats.error);
  if (hoods.error) dbFail("list_neighbourhoods", hoods.error);

  return (
    <>
      <AdminHeader
        title="Categories & neighbourhoods"
        description="Deactivate instead of deleting: profiles keep their links and the public pages simply hide inactive items."
      />
      <div className="grid gap-8 xl:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Categories</h2>
          <Panel title="Add a category">
            <CategoryForm action={saveCategory.bind(null, null)} isNew />
          </Panel>
          {cats.data.map((c) => (
            <details key={c.id} className="border-border bg-surface rounded-md border">
              <summary className="cursor-pointer px-5 py-3 text-sm font-semibold">
                {c.name} <span className="text-muted font-normal">/{c.slug}</span>
                {!c.active && <span className="text-error ml-2 text-xs">inactive</span>}
              </summary>
              <div className="border-border border-t p-5">
                <CategoryForm
                  action={saveCategory.bind(null, c.id)}
                  values={{
                    name: c.name,
                    slug: c.slug,
                    description: c.description,
                    displayOrder: c.display_order,
                    active: c.active,
                  }}
                />
              </div>
            </details>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Neighbourhoods</h2>
          <Panel title="Add a neighbourhood">
            <NeighbourhoodForm action={saveNeighbourhood.bind(null, null)} isNew />
          </Panel>
          {hoods.data.map((n) => (
            <details key={n.id} className="border-border bg-surface rounded-md border">
              <summary className="cursor-pointer px-5 py-3 text-sm font-semibold">
                {n.name} <span className="text-muted font-normal">/{n.slug}</span>
                {!n.active && <span className="text-error ml-2 text-xs">inactive</span>}
              </summary>
              <div className="border-border border-t p-5">
                <NeighbourhoodForm
                  action={saveNeighbourhood.bind(null, n.id)}
                  values={{ name: n.name, slug: n.slug, active: n.active }}
                />
              </div>
            </details>
          ))}
        </section>
      </div>
    </>
  );
}
