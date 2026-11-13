"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { dbFail } from "@/lib/admin/db";
import { requirePermission } from "@/lib/auth/session";
import { runAction, type ActionResult } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { categorySchema, neighbourhoodSchema } from "@/lib/validation/admin";

function revalidateTaxonomy() {
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout"); // nav, filters and category pages all read taxonomy
}

const slugOrName = (form: FormData) => {
  const s = String(form.get("slug") ?? "").trim();
  return s || slugify(String(form.get("name") ?? ""));
};

export async function saveCategory(
  categoryId: string | null,
  _p: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("categories.manage");
    const input = categorySchema.parse({
      name: form.get("name"),
      slug: slugOrName(form),
      description: form.get("description"),
      displayOrder: form.get("displayOrder") || 0,
      active: form.get("active") === "on",
    });
    const row = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      display_order: input.displayOrder,
      active: input.active,
    };
    const db = await createSupabaseServerClient();
    const res = categoryId
      ? await db.from("categories").update(row).eq("id", z.uuid().parse(categoryId)).select("id").single()
      : await db.from("categories").insert(row).select("id").single();
    if (res.error) dbFail("save_category", res.error);
    await audit(session, categoryId ? "category.update" : "category.create", "category", res.data.id, {
      slug: input.slug,
    });
    revalidateTaxonomy();
    return undefined;
  });
}

export async function saveNeighbourhood(
  neighbourhoodId: string | null,
  _p: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePermission("categories.manage");
    const input = neighbourhoodSchema.parse({
      name: form.get("name"),
      slug: slugOrName(form),
      active: form.get("active") === "on",
    });
    const db = await createSupabaseServerClient();
    const res = neighbourhoodId
      ? await db
          .from("neighbourhoods")
          .update(input)
          .eq("id", z.uuid().parse(neighbourhoodId))
          .select("id")
          .single()
      : await db.from("neighbourhoods").insert(input).select("id").single();
    if (res.error) dbFail("save_neighbourhood", res.error);
    await audit(
      session,
      neighbourhoodId ? "neighbourhood.update" : "neighbourhood.create",
      "neighbourhood",
      res.data.id,
      {
        slug: input.slug,
      },
    );
    revalidateTaxonomy();
    return undefined;
  });
}
