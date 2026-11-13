import type { Metadata } from "next";
import Link from "next/link";
import { SubmissionForm } from "@/components/forms/submission-form";
import { FormPage } from "@/components/layout/form-page";
import { listCategories, listNeighbourhoods } from "@/lib/db/public";

export const metadata: Metadata = {
  title: "Share your story",
  description: "Tell People of Chennai your story. An editor reads every submission, and nothing is published without your consent.",
  alternates: { canonical: "/submit" },
};

export default async function SubmitPage() {
  const [categories, neighbourhoods] = await Promise.all([listCategories(), listNeighbourhoods()]);
  return (
    <FormPage
      eyebrow="Take part"
      title="Share your story"
      intro={
        <p>
          You don’t need to have done something famous. If you have a story about your work, your street or your city, we’d
          like to hear it.
        </p>
      }
      aside={
        <ol className="space-y-3">
          <li><strong className="text-foreground">1. You write.</strong> As much or as little as you like.</li>
          <li><strong className="text-foreground">2. We read.</strong> An editor reads every submission and may email you with questions.</li>
          <li><strong className="text-foreground">3. You approve.</strong> Nothing is published until you’ve seen and agreed to the final version.</li>
          <li>
            Changed your mind later? <Link href="/contact?subject=consent_withdrawal" className="underline underline-offset-4">Ask us to take it down</Link>.
          </li>
        </ol>
      }
    >
      <SubmissionForm
        categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
        neighbourhoods={neighbourhoods.map((n) => ({ value: n.slug, label: n.name }))}
      />
    </FormPage>
  );
}
