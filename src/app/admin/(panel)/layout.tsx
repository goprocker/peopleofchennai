import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { can, ROLE_LABELS } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { signOut } from "../(auth)/actions";

export const metadata: Metadata = {
  title: { default: "Editor desk", template: "%s · Editor desk" },
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePagePermission("dashboard.view");
  const items = ADMIN_NAV.filter((i) => can(session.role, i.permission)).map(({ href, label }) => ({
    href,
    label,
  }));

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="border-border bg-surface border-b lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="flex items-baseline justify-between gap-3 lg:block">
            <Link href="/admin" className="font-serif text-xl tracking-wide uppercase">
              People of Chennai
            </Link>
            <p className="eyebrow text-muted lg:mt-1">Editor desk</p>
          </div>
          <AdminNav items={items} />
          <div className="border-border mt-auto hidden border-t pt-4 text-sm lg:block">
            <p className="truncate font-medium">{session.displayName ?? session.email}</p>
            <p className="text-muted">{ROLE_LABELS[session.role]}</p>
            <div className="mt-3 flex gap-3">
              <Link href="/" className="underline underline-offset-4">
                View site
              </Link>
              <form action={signOut}>
                <button type="submit" className="underline underline-offset-4">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-8 focus:outline-none sm:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
        <form action={signOut} className="border-border mt-12 border-t pt-4 text-sm lg:hidden">
          <span className="text-muted">
            {session.email} · {ROLE_LABELS[session.role]} ·{" "}
          </span>
          <button type="submit" className="underline underline-offset-4">
            Sign out
          </button>
        </form>
      </main>
    </div>
  );
}
