import Link from "next/link";
import { footerNav } from "@/lib/navigation";
import { EditorialDivider } from "./editorial-divider";
import { PageContainer } from "./page-container";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-ink text-ivory">
      <PageContainer width="wide" className="py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <p className="display-md">Every person here is someone’s neighbour.</p>
            <p className="mt-4 text-sm leading-relaxed text-ivory/75">
              An independent, people-first archive of the city — told with consent, edited with care.
            </p>
          </div>
          {footerNav.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="eyebrow text-sand">{group.heading}</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-ivory/85 underline-offset-4 hover:text-ivory hover:underline">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <EditorialDivider variant="kolam" className="mt-14 [&>span]:bg-ivory/20" />
        <div className="mt-6 flex flex-col gap-2 text-xs text-ivory/70 sm:flex-row sm:justify-between">
          <p>© {year} People of Chennai</p>
          <p lang="ta">சென்னை மக்கள்</p>
        </div>
      </PageContainer>
    </footer>
  );
}
