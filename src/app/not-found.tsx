import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { buttonStyles } from "@/components/ui/button";
import SiteLayout from "./(site)/layout";

export default function NotFound() {
  // Rendered outside any route group for unmatched URLs, so it brings the public chrome itself.
  return (
    <SiteLayout>
      <PageContainer width="narrow" className="py-24 text-center">
        <p className="eyebrow text-accent">404</p>
        <h1 className="display-lg mt-4">We couldn’t find that page.</h1>
        <p className="text-muted mt-5 text-lg">
          It may have moved, or the story may have been taken down at the person’s request.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link href="/people" className={buttonStyles()}>
            Browse people
          </Link>
          <Link href="/" className={buttonStyles({ variant: "outline" })}>
            Go home
          </Link>
        </div>
      </PageContainer>
    </SiteLayout>
  );
}
