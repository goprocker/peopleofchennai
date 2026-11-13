import { PageContainer } from "./page-container";

/** Two-column layout for public forms: intro and reassurance on the left, the form on the right. */
export function FormPage({
  eyebrow,
  title,
  intro,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <PageContainer width="wide" className="pt-14 md:pt-20">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20">
        <header className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow text-accent">{eyebrow}</p>
          <h1 className="display-lg mt-4">{title}</h1>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-muted">{intro}</div>
          {aside && <div className="mt-8 border-t border-border pt-8 text-sm leading-relaxed text-muted">{aside}</div>}
        </header>
        <div>{children}</div>
      </div>
    </PageContainer>
  );
}

/** Long-form text page (about, policies). */
export function ProsePage({
  eyebrow,
  title,
  updated,
  notice,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <PageContainer width="narrow" className="pt-14 md:pt-20">
      <p className="eyebrow text-accent">{eyebrow}</p>
      <h1 className="display-lg mt-4">{title}</h1>
      {updated && <p className="mt-4 text-sm text-muted">Last updated {updated}</p>}
      {notice && (
        <div role="note" className="mt-8 rounded-sm border-l-4 border-sand bg-surface-sunk px-5 py-4 text-sm">
          {notice}
        </div>
      )}
      <div className="prose-editorial mt-10 space-y-5 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-12 [&_h2]:font-serif [&_h2]:text-3xl [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </PageContainer>
  );
}

export const LEGAL_REVIEW_NOTICE = (
  <>
    <strong>Draft for legal review.</strong> This text is a starting template and has not yet been reviewed by a lawyer.
    It must be checked against India’s Digital Personal Data Protection Act, 2023 and any other applicable law before launch.
  </>
);
