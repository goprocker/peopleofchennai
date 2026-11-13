import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/form-page";

export const metadata: Metadata = {
  title: "Editorial policy",
  description: "How People of Chennai selects, edits, publishes and removes stories.",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <ProsePage eyebrow="The fine print" title="Editorial policy" updated="13 November 2026">
      <h2>Consent comes first</h2>
      <p>
        We only publish a profile or story when the person it is about has given clear, recorded consent. A nomination alone
        is never enough. Consent can be withdrawn at any time, and when it is, we unpublish the profile.
      </p>
      <h2>Selection</h2>
      <p>
        Editors read every submission and nomination. We aim for a mix of people, neighbourhoods, ages and walks of life. We
        don’t accept payment for coverage, and featured people do not pay or get paid.
      </p>
      <h2>Editing</h2>
      <ul>
        <li>We edit for clarity, length and accuracy, and keep the person’s voice.</li>
        <li>Direct quotes are not changed in meaning.</li>
        <li>The person reviews the final text and photos before publication.</li>
      </ul>
      <h2>What we won’t publish</h2>
      <ul>
        <li>Private contact details, home addresses, or information about children without a guardian’s consent.</li>
        <li>Hate speech, harassment, or claims we can’t reasonably check.</li>
        <li>Promotional content presented as a story.</li>
      </ul>
      <h2>Corrections and removals</h2>
      <p>
        If something is wrong, <Link href="/contact?subject=correction">tell us</Link> and we’ll fix it and note the
        correction. To remove a profile, <Link href="/contact?subject=removal">send a removal request</Link>. We unpublish it
        while we confirm the request.
      </p>
      <h2>Sample content</h2>
      <p>
        During development, the site may show fictional sample profiles marked with a visible “Sample” label. They are not real
        people and will be removed before launch.
      </p>
    </ProsePage>
  );
}
