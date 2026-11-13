"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { buttonStyles } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="flex-1">
      <PageContainer width="narrow" className="py-24 text-center">
        <p className="eyebrow text-accent">Something went wrong</p>
        <h1 className="display-lg mt-4">We couldn’t load this page.</h1>
        <p className="text-muted mt-5 text-lg">It’s probably temporary. Try again, or head back home.</p>
        {error.digest && <p className="text-muted mt-3 text-xs">Reference: {error.digest}</p>}
        <div className="mt-10 flex justify-center gap-3">
          <button type="button" onClick={reset} className={buttonStyles()}>
            Try again
          </button>
          <Link href="/" className={buttonStyles({ variant: "outline" })}>
            Go home
          </Link>
        </div>
      </PageContainer>
    </main>
  );
}
