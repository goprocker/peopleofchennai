# Session Handoff — People of Chennai

_Last updated: 2026-11-13_

Approved plan: `C:\Users\gopin\.claude\plans\pasted-content-id-77b1-claude-compressed-lynx.md`
Inspiration: peopleofbengaluru.com, used for general direction only (all-caps masthead, people-first, warm second-person copy). Do not copy its layout, branding or text.
Supabase: the user chose a **hosted dev project**. Credentials have not been provided yet. Ask for approval before applying migrations.

## Overall progress: about 50%

Nothing has been run or tested yet: no typecheck, lint, tests or dev server.

### Done
**Setup (Phase 1, partial)**
- Next.js 16.4.6 scaffold (App Router, TS strict, Tailwind v4, src/, `@/*` alias). The first `create-next-app` run was interrupted after writing files, so the scaffold was kept and dependencies installed separately.
- Runtime deps installed: supabase-js, @supabase/ssr, motion, lucide-react, react-hook-form, @hookform/resolvers, zod 4, resend, server-only, sharp, tiptap, clsx, tailwind-merge, cva.
- Dev deps installed: @types/node 24 (bumped from 20 to fix a vitest peer conflict), prettier + tailwind plugin, vitest, @vitejs/plugin-react, @playwright/test, tsx.
  - ⚠ The esbuild postinstall was blocked by npm allowScripts. If tsx/vitest fail, run `npm install-scripts approve esbuild`.
- `package.json` scripts: typecheck, format, test, test:integration, test:e2e, check, bootstrap-admin.
- `next.config.ts`: security headers, noindex header on /admin, Supabase image host, server action body limit 6 MB. The scaffold's `cacheComponents` was removed.
- `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`, `tests/stubs/server-only.ts`.
- `src/app/globals.css`: "Chennai Edit" design tokens (palette plus semantic tokens with AA notes), display type utilities using clamp(), reduced-motion handling, focus ring, portrait hover treatment.
- Removed the default Next.js SVGs from `public/`.

**Database (Phase 3 SQL, written but NOT applied)**
- `supabase/migrations/20261113000001_schema.sql`: all tables from spec §10, plus profile_media, interview_answers, site_settings and rate_limits. Includes enums, check constraints, FKs, indexes, updated_at triggers, a generated tsvector with GIN index, a `check_rate_limit()` function, a **consent guard trigger** (can't publish a non-sample profile without granted consent) and **auto-unpublish on consent withdrawal**.
- `20261113000002_rls.sql`: `has_role` / `is_staff` / `can_edit`. Anon gets read access to published content only; private tables are staff-only. Storage buckets: `public-media` (public) and `submission-uploads` (private).
- `20261113000003_search.sql`: `search_people()` RPC (prefix full-text search, category and neighbourhood filters, sort, pagination with a total count).
- `supabase/seed.sql`: 8 categories, 10 neighbourhoods, settings, 6 **fictional** sample profiles (`is_sample`, names say "(Sample)"), 1 draft profile for privacy tests, and 2 sample stories.
- `public/images/samples/portrait-1..6.svg`: placeholder portraits labelled "SAMPLE".

**Core library code**
- `src/types/domain.ts`: public DTOs, with no private fields.
- `src/lib/env.ts`: Zod env validation, `isSupabaseConfigured`, `siteUrl`.
- `src/lib/utils.ts` (cn, slugify, uniqueSlug, formatDate, truncate), `src/lib/logger.ts` (JSON logs with redaction), `src/lib/errors.ts` (AppError, errorResponse, ActionResult/runAction).
- `src/lib/supabase/{server,admin,browser}.ts`: session client, cookie-less public client, and a service-role client guarded by `server-only`.
- `src/lib/auth/permissions.ts` (role-to-permission matrix) and `src/lib/auth/session.ts` (getStaffSession, requirePagePermission, requirePermission).
- `src/proxy.ts`: Next 16 proxy that refreshes the session and redirects signed-out users away from /admin. Layouts still re-check on the server.
- `src/lib/validation/{query,public-forms,admin}.ts`: all Zod schemas (people query parse/serialise, submission, nomination, contact with bot fields, image constants, profile, story, consent, settings, roles).
- `src/lib/db/mappers.ts`: row-to-DTO mappers, media URL resolver, and PostgREST select strings.
- `src/lib/db/sample-data.ts`: sample data used only when Supabase isn't configured.

- `src/lib/db/public.ts` ✅: listCategories/getCategory, listNeighbourhoods, listPeople (search_people RPC → ordered hydrate), getPerson (sections, gallery, interview, links), listRelatedPeople (category/neighbourhood scoring), listFeaturedPeople, listRecentPeople, listStories (PGRST103 → empty page), listFeaturedStories, getStory, listStoriesForPerson, slug lists for sitemap. Falls back to sample data. Typecheck passes for this file.

- Step 2 ✅ Root layout + shell: `src/app/layout.tsx` (Instrument Serif / DM Sans / Noto Sans Tamil via next/font, metadata template, skip link, `<main id="main">`), `src/lib/navigation.ts` (nav config, isActivePath), `src/components/layout/{site-header,desktop-navigation,mobile-navigation,site-footer,page-container,section-heading,editorial-divider}.tsx`. Mobile menu: focus trap, Escape, scroll lock, closes on route change. Header has a solid bg on purpose (backdrop-filter would trap the fixed mobile panel). `tsc` + `eslint src` clean. Not yet viewed in a browser.

- Step 3 ✅ Public pages: home (8 sections, Motion `Reveal`), /people (GET-form filters, works without JS), /people/[slug], /stories, /stories/[slug] (safe allow-list `RichText` renderer), /categories/[slug], /submit, /nominate, /contact (`?subject=` preselect), /about, /editorial-policy, /privacy + /terms (flagged "Draft for legal review"), loading/error/not-found. Components in `src/components/{ui,people,stories,forms,motion,layout}`.
  - Forms are client-side (react-hook-form + shared Zod schemas) and POST to routes that **don't exist yet**: `/api/submissions` (multipart: `payload` JSON + optional `photo`), `/api/nominations` and `/api/contact` (JSON). They read `ErrorBody.fields` back into field errors.
  - `startedAt` is set via `formStartTime()` in effects/handlers (React Compiler purity rule).
  - Sample SVGs already carry a "SAMPLE" label, so cards only overlay `SampleBadge` when the image itself isn't a sample.
  - Unknown slugs render the 404 page with noindex but HTTP 200 (root `loading.tsx` streams first). Acceptable; revisit if a real 404 status is needed.
  - Verified: tsc + eslint clean; all 17 routes load on sample data; home, /people and a profile checked visually at desktop width, with no console errors. **Mobile width not visually checked** (browser window wouldn't resize).

- Step 4 ✅ Public API and services: `src/lib/services/{request-meta,rate-limit,bot-check,images,email,http,intake}.ts`, routes `src/app/api/{people,stories,submissions,nominations,contact}/route.ts`.
  - Order of checks: same-origin (only when an Origin header is present) → body size/type → Zod → honeypot + ≥3s timing + Turnstile (only if `TURNSTILE_SECRET_KEY` is set) → per-IP-hash rate limit (3/h submissions, 5/h nominations and contact; `check_rate_limit` RPC, with an in-memory fallback) → sharp byte check (re-encodes and strips EXIF; at least 400px) → service-role insert.
  - Self submission writes `consent_records` rows marked granted (publication, plus photo if one was attached). A nomination writes `nominee_publication` as **requested**. Rollback runs on partial failure. Emails go out via `after()`: editors get no PII, the submitter gets an acknowledgement, and the nominee is never emailed.
  - Without Supabase, POST returns 503 SERVICE_UNAVAILABLE; GETs serve sample data.
  - The honeypot Zod rule was relaxed so bots get the generic BOT_DETECTED message instead of a field hint.
  - Smoke-tested with curl on :3100: validation, honeypot, timing, cross-origin 403, 429 on burst, small or fake image rejected, valid → 503 (no DB). The DB write path is **untested** until credentials arrive.

- Step 5 ✅ Admin (code complete; **runtime-untested against a real DB**):
  - **Route groups:** public pages moved to `src/app/(site)/` (its layout holds the header, main and footer). The root layout now contains only html, body, fonts and the skip link. Root `not-found.tsx` wraps itself in the site layout, so unknown URLs get a real 404 status. Revalidate group paths as `/(site)/...`.
  - **Auth:** `src/app/admin/(auth)/` has login, forgot-password and reset-password (Server Actions). Login is rate limited per IP hash and gives one generic error. Users without a role are signed out. `/auth/callback` exchanges the reset/invite code, and `next` may only point inside `/admin`.
  - **Panel:** `src/app/admin/(panel)/`; the layout is gated by `requirePagePermission`. Navigation is filtered by role (`src/lib/admin/nav.ts`).
  - **Pages:** dashboard; submissions (filters, detail with notes, status, consent record/withdraw, convert to a **draft** profile, signed URL for the private photo, copy the photo to the media library once photo consent is granted); messages; people (list, new, editor with sections, interview, links, categories, portrait and gallery; publication controls; consent panel); stories (Tiptap editor limited to the RichText allow-list; a story about a person can't be published until their profile is); categories and neighbourhoods; media (sharp re-encode upload, alt text, delete is blocked while the image is in a gallery); settings (submissions open/closed, consent version, notification emails, grant/revoke editor roles through the invite API); audit log.
  - **Shared code:** `src/components/admin/{action-form,ui,consent-forms,publication-controls,rich-text-editor,...}` and `src/lib/admin/{audit,db,format,nav,publication}.ts`. `ActionForm` submits through `startTransition`, so fields aren't reset after an error.
  - **Safety:**
    - Admin writes use the session client, so RLS applies.
    - The service role is used only for invites/user lookup and the cross-bucket photo copy.
    - Every action calls `requirePermission` and writes to `audit()`.
    - Unpublishing or archiving a profile also unpublishes its stories.
    - The withdrawal trigger in the migration now unpublishes stories as well (the migration file was edited, which is fine because it hasn't been applied).
    - `submissions_open=false` makes intake return 503.
    - Editor notification emails come from the env var plus the DB setting.
  - **ESLint:** `_`-prefixed unused args are allowed (Server Action signature).
  - **Verified:** tsc and eslint clean. On :3100 all public routes return 200, `/nope` returns 404, `/admin*` redirects with 307 to login, the login, forgot and reset pages show the "needs Supabase" notice, and `/auth/callback` redirects safely.
  - **Known gaps:**
    - The profile save replaces child rows in several steps rather than one transaction; re-saving fixes a partial failure.
    - The public `/submit` page doesn't show a "closed" state yet; the API still refuses.
    - The admin hasn't been viewed in a browser.
    - A dev server (PID 7840, :3100) locks folders, so moving route folders needs copy-then-delete.

### Pending (in order)
6. **SEO**: generateMetadata, OG image route, JSON-LD, sitemap.ts, robots.ts, noindex on admin and previews.
7. **Tests**: Vitest unit tests (schemas, slug, query parsing, permissions, publish rules), integration tests against the dev Supabase project, Playwright with the 12 journeys plus mobile, GitHub Actions CI.
8. **Docs**: README, `.env.example`, docs/ARCHITECTURE, DATABASE, API, EDITORIAL_WORKFLOW, DEPLOYMENT, SECURITY; `scripts/bootstrap-admin.ts`.
9. **Verify**: typecheck, lint, test, build; visual check in the browser.

### Needed from the user
- Supabase dev project: URL, anon key, service-role key (put in `.env.local`), plus approval to apply migrations and seed.
- Later: Resend API key and a verified sender domain; optional Turnstile keys; production site URL.
