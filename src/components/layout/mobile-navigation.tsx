"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { isActivePath, primaryNav, submitCta } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Full-screen menu for small screens: traps focus, closes on Escape and on navigation. */
export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = [
        toggleRef.current,
        ...panelRef.current.querySelectorAll<HTMLElement>("a[href]"),
      ].filter((el): el is HTMLElement => Boolean(el));
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="relative z-50 -mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-sunk"
      >
        {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="fixed inset-0 z-40 overflow-y-auto bg-background px-4 pt-24 pb-10"
      >
        <nav aria-label="Main">
          <ul className="flex flex-col">
            {primaryNav.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href} className="border-b border-border">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("display-md block py-4", active && "text-accent")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={submitCta.href}
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            {submitCta.label}
          </Link>
        </nav>
      </div>
    </div>
  );
}
