import type { Metadata } from "next";
import { NominationForm } from "@/components/forms/nomination-form";
import { FormPage } from "@/components/layout/form-page";
import { listCategories, listNeighbourhoods } from "@/lib/db/public";

export const metadata: Metadata = {
  title: "Nominate someone",
  description: "Know someone in Chennai whose story deserves telling? Nominate them.",
  alternates: { canonical: "/nominate" },
};

export default async function NominatePage() {
  const [categories, neighbourhoods] = await Promise.all([listCategories(), listNeighbourhoods()]);
  return (
    <FormPage
      eyebrow="Take part"
      title="Nominate someone"
      intro={
        <p>
          The flower seller who knows every regular by name, the coach who never misses a practice. Tell us who they are and
          why they matter to you.
        </p>
      }
      aside={
        <p>
          A nomination is a suggestion, not a publication. If we follow up, we contact the person directly and only publish
          with their consent. We never tell them who nominated them unless you say we can.
        </p>
      }
    >
      <NominationForm
        categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
        neighbourhoods={neighbourhoods.map((n) => ({ value: n.slug, label: n.name }))}
      />
    </FormPage>
  );
}
