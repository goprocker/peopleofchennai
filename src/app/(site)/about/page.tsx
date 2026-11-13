import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/form-page";

export const metadata: Metadata = {
  title: "About",
  description: "Why People of Chennai exists and how we work.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ProsePage eyebrow="About the project" title="A city is its people">
      <p>
        Chennai is often described through its landmarks: the beach, the temples, the traffic. People of Chennai describes it
        through the people who live here, one person at a time.
      </p>
      <p>
        We feature artists and engineers, students and shopkeepers, coaches, carers and quiet volunteers. Some have done
        remarkable things. Most have simply lived interesting lives in an interesting city, and that’s enough.
      </p>
      <h2>How we work</h2>
      <ul>
        <li>Everyone featured has agreed to be featured. We record that consent and you can withdraw it at any time.</li>
        <li>Stories are edited for length and clarity, never for meaning. The person sees the final version before it goes live.</li>
        <li>We don’t publish private contact details, and we don’t sell or share personal data.</li>
      </ul>
      <p>
        Read our <Link href="/editorial-policy">editorial policy</Link> for the details.
      </p>
      <h2>Take part</h2>
      <p>
        <Link href="/submit">Share your own story</Link>, <Link href="/nominate">nominate someone</Link>, or{" "}
        <Link href="/contact">get in touch</Link>.
      </p>
    </ProsePage>
  );
}
