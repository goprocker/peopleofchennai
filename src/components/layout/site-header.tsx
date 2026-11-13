import Link from "next/link";
import { submitCta } from "@/lib/navigation";
import { DesktopNavigation } from "./desktop-navigation";
import { MobileNavigation } from "./mobile-navigation";
import { PageContainer } from "./page-container";

export function SiteHeader() {
  // Solid background on purpose: backdrop-filter would make the fixed mobile menu panel position against the header.
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background">
      <PageContainer width="wide" className="flex h-16 items-center justify-between gap-6 md:h-20">
        <Link href="/" className="relative z-50 flex flex-col leading-none" aria-label="People of Chennai — home">
          <span className="text-[0.95rem] font-bold tracking-[0.22em] md:text-base">PEOPLE OF CHENNAI</span>
          <span lang="ta" className="mt-1 text-xs text-muted">
            சென்னை மக்கள்
          </span>
        </Link>
        <div className="flex items-center gap-8">
          <DesktopNavigation />
          <Link
            href={submitCta.href}
            className="hidden min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover md:inline-flex"
          >
            {submitCta.label}
          </Link>
          <MobileNavigation />
        </div>
      </PageContainer>
    </header>
  );
}
