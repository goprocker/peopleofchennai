"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdminActive } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const active = isAdminActive(pathname, item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-sm px-3 py-2 text-sm whitespace-nowrap",
                  active ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-surface-sunk",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
