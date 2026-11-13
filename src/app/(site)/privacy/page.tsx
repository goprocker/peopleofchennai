import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_REVIEW_NOTICE, ProsePage } from "@/components/layout/form-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What personal data People of Chennai collects, why, and your rights.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="The fine print" title="Privacy notice" updated="13 November 2026" notice={LEGAL_REVIEW_NOTICE}>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Submissions:</strong> your name, email, story, optional photo, links, category and neighbourhood.</li>
        <li><strong>Nominations:</strong> your name and email, plus what you tell us about the person you nominate.</li>
        <li><strong>Contact messages:</strong> your name, email and message.</li>
        <li>
          <strong>Technical data:</strong> a one-way hash of your IP address, kept briefly to stop spam and abuse. We don’t use
          advertising trackers.
        </li>
      </ul>
      <h2>Why we use it</h2>
      <p>
        To review your submission, contact you about it, publish the parts you agree to, keep a record of your consent, and
        protect the site from abuse.
      </p>
      <h2>What becomes public</h2>
      <p>
        Only what you approve for publication: usually your name, story, photo and the links you choose. Your email and any
        private details stay private and are only seen by our editors.
      </p>
      <h2>How long we keep it</h2>
      <p>
        Submissions we don’t publish are deleted within 12 months. Consent records are kept for as long as the related story
        is published and for a limited period afterwards, as evidence of consent.
      </p>
      <h2>Who we share it with</h2>
      <p>
        Our hosting, database and email providers process data on our behalf. We don’t sell personal data or share it for
        advertising.
      </p>
      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your data, or withdraw your consent, at any time.{" "}
        <Link href="/contact?subject=consent_withdrawal">Contact us</Link> and we’ll respond promptly.
      </p>
    </ProsePage>
  );
}
