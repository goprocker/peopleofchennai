import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_REVIEW_NOTICE, ProsePage } from "@/components/layout/form-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for People of Chennai.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <ProsePage eyebrow="The fine print" title="Terms of use" updated="13 November 2026" notice={LEGAL_REVIEW_NOTICE}>
      <h2>Using the site</h2>
      <p>You’re welcome to read, share and link to stories. Please don’t scrape the site in bulk or misuse the forms.</p>
      <h2>What you send us</h2>
      <ul>
        <li>Only submit information that is true and that you have the right to share.</li>
        <li>
          When you submit a story or photo, you keep ownership of it. You give us permission to edit and publish it as described
          in our <Link href="/editorial-policy">editorial policy</Link>, once you have approved the final version.
        </li>
        <li>You can withdraw that permission at any time, and we will unpublish the content.</li>
      </ul>
      <h2>Content on the site</h2>
      <p>
        Stories and photos belong to the people featured and to People of Chennai. Please ask before reusing them beyond
        sharing a link.
      </p>
      <h2>No guarantees</h2>
      <p>
        We work hard to be accurate, but stories reflect the experiences and views of the people featured. If you spot an
        error, <Link href="/contact?subject=correction">let us know</Link>.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows when they last changed.</p>
    </ProsePage>
  );
}
