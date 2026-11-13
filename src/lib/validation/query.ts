import { z } from "zod";

export const PAGE_SIZE = 12;
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80);

export const peopleQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(80)
    .transform((s) => s.replace(/\s+/g, " "))
    .optional()
    .catch(undefined),
  category: slug.optional().catch(undefined),
  neighbourhood: slug.optional().catch(undefined),
  sort: z.enum(["recent", "name"]).default("recent").catch("recent"),
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});
export type PeopleQuery = z.infer<typeof peopleQuerySchema>;

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function firstValues(params: RawParams): Record<string, string | undefined> {
  if (params instanceof URLSearchParams) return Object.fromEntries(params.entries());
  return Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
}

/** Lenient parse: invalid values fall back to defaults instead of erroring. Empty strings are dropped. */
export function parsePeopleQuery(params: RawParams): PeopleQuery {
  const raw = Object.fromEntries(
    Object.entries(firstValues(params)).filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = peopleQuerySchema.parse(raw);
  if (parsed.q === "") parsed.q = undefined;
  return parsed;
}

/** Serialise back into a stable, shareable query string (omits defaults). */
export function peopleQueryToSearch(q: Partial<PeopleQuery>): string {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  if (q.category) sp.set("category", q.category);
  if (q.neighbourhood) sp.set("neighbourhood", q.neighbourhood);
  if (q.sort && q.sort !== "recent") sp.set("sort", q.sort);
  if (q.page && q.page > 1) sp.set("page", String(q.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  status: z.string().max(40).optional().catch(undefined),
  type: z.enum(["self", "nomination"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
});
