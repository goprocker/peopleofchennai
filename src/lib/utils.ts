import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL-safe slug: lowercase ASCII, hyphen-separated, max 80 chars. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Append a short random suffix to keep slugs unique without leaking ids. */
export function uniqueSlug(base: string, suffix = Math.random().toString(36).slice(2, 7)) {
  const s = slugify(base) || "untitled";
  return `${s.slice(0, 72)}-${suffix}`;
}

export function formatDate(iso: string | null | undefined, locale = "en-IN") {
  if (!iso) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

export function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
