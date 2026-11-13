-- People of Chennai — core schema
-- Apply with: supabase db push   (or paste into the Supabase SQL editor in order)

create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- ───────────────────────── Enums ─────────────────────────
create type publication_status as enum ('draft', 'in_review', 'published', 'unpublished', 'archived');
create type review_status as enum ('pending', 'under_review', 'awaiting_consent', 'approved', 'rejected', 'published');
create type submission_type as enum ('self', 'nomination');
create type editor_role as enum ('super_admin', 'editor', 'reviewer');
create type consent_status as enum ('requested', 'granted', 'withdrawn', 'declined');
create type consent_type as enum ('publication', 'photo', 'nominee_publication');
create type contact_status as enum ('new', 'read', 'resolved');
create type contact_subject as enum ('general', 'correction', 'removal', 'consent_withdrawal', 'press', 'other');
create type social_platform as enum ('website', 'instagram', 'linkedin', 'github', 'portfolio', 'x', 'youtube', 'other');

-- ───────────────────────── Helpers ─────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────────────────── Taxonomy ─────────────────────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 400),
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table neighbourhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Editors ─────────────────────────
create table editor_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role editor_role not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Media ─────────────────────────
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('public-media', 'submission-uploads')),
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) <= 255),
  mime_type text not null check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp')
    -- bundled development placeholders only (served from /public, never uploaded)
    or (mime_type = 'image/svg+xml' and storage_path like 'sample/%')
  ),
  file_size int not null check (file_size > 0 and file_size <= 10485760),
  width int not null check (width > 0),
  height int not null check (height > 0),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index media_assets_created_idx on media_assets (created_at desc);

-- ───────────────────────── Profiles ─────────────────────────
create table profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  full_name text not null check (char_length(full_name) between 2 and 120),
  headline text not null check (char_length(headline) between 4 and 160),
  short_bio text not null default '' check (char_length(short_bio) <= 600),
  long_bio text not null default '' check (char_length(long_bio) <= 20000),
  -- Structured story sections (all optional)
  story_introduction text check (char_length(story_introduction) <= 5000),
  story_background text check (char_length(story_background) <= 5000),
  story_journey text check (char_length(story_journey) <= 5000),
  story_challenges text check (char_length(story_challenges) <= 5000),
  story_achievements text check (char_length(story_achievements) <= 5000),
  story_chennai text check (char_length(story_chennai) <= 5000),
  story_aspirations text check (char_length(story_aspirations) <= 5000),
  pull_quote text check (char_length(pull_quote) <= 300),
  neighbourhood_id uuid references neighbourhoods (id) on delete set null,
  portrait_media_id uuid references media_assets (id) on delete set null,
  is_sample boolean not null default false,
  featured boolean not null default false,
  publication_status publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(headline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(short_bio, '')), 'C')
  ) stored,
  constraint profiles_published_at_chk check (publication_status <> 'published' or published_at is not null)
);
create index profiles_search_idx on profiles using gin (search_vector);
create index profiles_status_published_idx on profiles (publication_status, published_at desc);
create index profiles_neighbourhood_idx on profiles (neighbourhood_id);
create index profiles_featured_idx on profiles (featured) where featured;
create trigger profiles_updated_at before update on profiles for each row execute function set_updated_at();

create table profile_categories (
  profile_id uuid not null references profiles (id) on delete cascade,
  category_id uuid not null references categories (id) on delete restrict,
  primary key (profile_id, category_id)
);
create index profile_categories_category_idx on profile_categories (category_id);

create table profile_media (
  profile_id uuid not null references profiles (id) on delete cascade,
  media_id uuid not null references media_assets (id) on delete restrict,
  caption text check (char_length(caption) <= 300),
  display_order int not null default 0,
  primary key (profile_id, media_id)
);

create table interview_answers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  question text not null check (char_length(question) between 4 and 200),
  answer text not null check (char_length(answer) between 1 and 4000),
  display_order int not null default 0
);
create index interview_answers_profile_idx on interview_answers (profile_id, display_order);

create table social_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  platform social_platform not null,
  url text not null check (url ~* '^https://' and char_length(url) <= 500),
  display_order int not null default 0
);
create index social_links_profile_idx on social_links (profile_id, display_order);

-- ───────────────────────── Stories ─────────────────────────
create table stories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 4 and 200),
  excerpt text not null default '' check (char_length(excerpt) <= 500),
  body_json jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  cover_media_id uuid references media_assets (id) on delete set null,
  is_sample boolean not null default false,
  featured boolean not null default false,
  publication_status publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  author_id uuid references auth.users (id) on delete set null,
  constraint stories_published_at_chk check (publication_status <> 'published' or published_at is not null),
  constraint stories_body_doc_chk check (body_json ->> 'type' = 'doc')
);
create index stories_status_published_idx on stories (publication_status, published_at desc);
create index stories_profile_idx on stories (profile_id);
create trigger stories_updated_at before update on stories for each row execute function set_updated_at();

-- ───────────────────────── Submissions ─────────────────────────
create table submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type submission_type not null,
  submitter_name text not null check (char_length(submitter_name) between 2 and 120),
  submitter_email text not null check (submitter_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nominee_name text check (char_length(nominee_name) <= 120),
  nominee_contact text check (char_length(nominee_contact) <= 300),
  category_id uuid references categories (id) on delete set null,
  neighbourhood_id uuid references neighbourhoods (id) on delete set null,
  story_pitch text not null check (char_length(story_pitch) between 10 and 600),
  story_details text not null default '' check (char_length(story_details) <= 10000),
  why_it_matters text check (char_length(why_it_matters) <= 2000),
  social_links jsonb not null default '[]'::jsonb,
  photo_media_id uuid references media_assets (id) on delete set null,
  review_status review_status not null default 'pending',
  converted_profile_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submissions_nomination_chk check (submission_type <> 'nomination' or nominee_name is not null)
);
create index submissions_status_idx on submissions (review_status, created_at desc);
create index submissions_type_idx on submissions (submission_type);
create trigger submissions_updated_at before update on submissions for each row execute function set_updated_at();

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions (id) on delete set null,
  profile_id uuid references profiles (id) on delete cascade,
  subject_reference text not null check (char_length(subject_reference) <= 200),
  consent_type consent_type not null,
  consent_version text not null,
  consent_status consent_status not null,
  recorded_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  evidence_reference text check (char_length(evidence_reference) <= 1000),
  recorded_by uuid references auth.users (id) on delete set null,
  constraint consent_target_chk check (submission_id is not null or profile_id is not null),
  constraint consent_withdrawn_chk check (consent_status <> 'withdrawn' or withdrawn_at is not null)
);
create index consent_records_profile_idx on consent_records (profile_id, recorded_at desc);
create index consent_records_submission_idx on consent_records (submission_id);

create table editorial_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  editor_id uuid references auth.users (id) on delete set null,
  note text not null check (char_length(note) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index editorial_notes_submission_idx on editorial_notes (submission_id, created_at);

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on audit_logs (created_at desc);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subject contact_subject not null default 'general',
  message text not null check (char_length(message) between 10 and 5000),
  status contact_status not null default 'new',
  created_at timestamptz not null default now()
);
create index contact_messages_status_idx on contact_messages (status, created_at desc);

create table site_settings (
  key text primary key check (key ~ '^[a-z_]+$'),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (bucket, window_start)
);

-- Atomic fixed-window rate limiter. Returns true when the request is allowed.
create or replace function check_rate_limit(p_bucket text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into rate_limits (bucket, window_start, hits) values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;
  delete from rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_limit;
end $$;
revoke all on function check_rate_limit(text, int, int) from public, anon, authenticated;

-- ───────────────────────── Publication guard ─────────────────────────
-- A profile may only become 'published' when a current, granted publication consent exists.
create or replace function enforce_profile_consent() returns trigger
language plpgsql as $$
begin
  if new.publication_status = 'published' and new.is_sample = false and not exists (
    select 1 from consent_records c
    where c.profile_id = new.id
      and c.consent_type in ('publication', 'nominee_publication')
      and c.consent_status = 'granted'
      and c.withdrawn_at is null
  ) then
    raise exception 'CONSENT_REQUIRED: profile % has no granted publication consent', new.id
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger profiles_consent_guard before insert or update of publication_status on profiles
  for each row execute function enforce_profile_consent();

-- When consent is withdrawn, immediately unpublish the profile and its stories.
create or replace function unpublish_on_withdrawal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.consent_status = 'withdrawn' and new.profile_id is not null and not exists (
    select 1 from consent_records c
    where c.profile_id = new.profile_id and c.id <> new.id
      and c.consent_type in ('publication', 'nominee_publication')
      and c.consent_status = 'granted' and c.withdrawn_at is null
  ) then
    update profiles set publication_status = 'unpublished' where id = new.profile_id and publication_status = 'published';
    -- Stories about this person come down with the profile.
    update stories set publication_status = 'unpublished' where profile_id = new.profile_id and publication_status = 'published';
  end if;
  return new;
end $$;
create trigger consent_withdrawal_unpublish after insert or update of consent_status on consent_records
  for each row execute function unpublish_on_withdrawal();
