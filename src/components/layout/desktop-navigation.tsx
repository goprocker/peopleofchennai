"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, primaryNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function DesktopNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-7 text-sm font-medium">
        {primaryNav.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative py-2 transition-colors hover:text-accent",
                  "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform hover:after:scale-x-100",
                  active && "text-accent after:scale-x-100",
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
