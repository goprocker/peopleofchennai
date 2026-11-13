import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex flex-1 items-center justify-center px-4 py-16 focus:outline-none"
    >
      <div className="w-full max-w-sm">
        <Link href="/" className="font-serif text-2xl tracking-wide uppercase">
          People of Chennai
        </Link>
        <p className="eyebrow text-muted mt-1">Editor desk</p>
        <div className="border-border bg-surface mt-8 rounded-md border p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
