export const humanize = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export const formatDateTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(iso))
    : "—";

/** Build a query string, omitting empty values and page 1. */
export function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== "" && v !== 1) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
