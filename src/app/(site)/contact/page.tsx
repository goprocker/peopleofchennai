import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { FormPage } from "@/components/layout/form-page";
import { CONTACT_SUBJECTS } from "@/lib/validation/public-forms";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions, corrections or removal requests — get in touch with People of Chennai.",
  alternates: { canonical: "/contact" },
};

type Subject = (typeof CONTACT_SUBJECTS)[number]["value"];
const isSubject = (v: unknown): v is Subject => CONTACT_SUBJECTS.some((s) => s.value === v);

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).subject;
  const subject = Array.isArray(raw) ? raw[0] : raw;
  return (
    <FormPage
      eyebrow="Get in touch"
      title="Contact us"
      intro={<p>Questions, corrections, partnerships, or a request to remove something — we read everything.</p>}
      aside={
        <p>
          <strong className="text-foreground">Removal and consent requests come first.</strong> If you’re asking us to take
          down a profile or story about you, choose that option and we’ll unpublish it while we confirm the request.
        </p>
      }
    >
      <ContactForm initialSubject={isSubject(subject) ? subject : undefined} />
    </FormPage>
  );
}
