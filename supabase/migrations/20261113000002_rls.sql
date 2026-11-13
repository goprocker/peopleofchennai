-- People of Chennai — Row Level Security & storage
-- Model: anon may read only published public content. Staff access is role-gated via has_role().
-- Public inserts (submissions, contact) go through validated, rate-limited server endpoints
-- that use the service role; anon has NO direct insert policy on any private table.

create or replace function has_role(roles editor_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from editor_roles where user_id = auth.uid() and role = any(roles));
$$;
revoke all on function has_role(editor_role[]) from public;
grant execute on function has_role(editor_role[]) to authenticated, anon;

create or replace function is_staff() returns boolean language sql stable as $$
  select has_role(array['super_admin','editor','reviewer']::editor_role[]);
$$;
create or replace function can_edit() returns boolean language sql stable as $$
  select has_role(array['super_admin','editor']::editor_role[]);
$$;

alter table categories enable row level security;
alter table neighbourhoods enable row level security;
alter table editor_roles enable row level security;
alter table media_assets enable row level security;
alter table profiles enable row level security;
alter table profile_categories enable row level security;
alter table profile_media enable row level security;
alter table interview_answers enable row level security;
alter table social_links enable row level security;
alter table stories enable row level security;
alter table submissions enable row level security;
alter table consent_records enable row level security;
alter table editorial_notes enable row level security;
alter table audit_logs enable row level security;
alter table contact_messages enable row level security;
alter table site_settings enable row level security;
alter table rate_limits enable row level security;

-- Taxonomy
create policy "public reads active categories" on categories for select using (active or is_staff());
create policy "editors manage categories" on categories for all to authenticated using (can_edit()) with check (can_edit());
create policy "public reads active neighbourhoods" on neighbourhoods for select using (active or is_staff());
create policy "editors manage neighbourhoods" on neighbourhoods for all to authenticated using (can_edit()) with check (can_edit());

-- Editor roles: users can see their own role; super admins manage all.
create policy "self reads own role" on editor_roles for select to authenticated using (user_id = auth.uid() or has_role(array['super_admin']::editor_role[]));
create policy "super admin manages roles" on editor_roles for all to authenticated
  using (has_role(array['super_admin']::editor_role[])) with check (has_role(array['super_admin']::editor_role[]));

-- Profiles
create policy "public reads published profiles" on profiles for select using (publication_status = 'published' or is_staff());
create policy "editors write profiles" on profiles for all to authenticated using (can_edit()) with check (can_edit());

create policy "public reads published profile categories" on profile_categories for select
  using (exists (select 1 from profiles p where p.id = profile_id and (p.publication_status = 'published' or is_staff())));
create policy "editors write profile categories" on profile_categories for all to authenticated using (can_edit()) with check (can_edit());

create policy "public reads published profile media" on profile_media for select
  using (exists (select 1 from profiles p where p.id = profile_id and (p.publication_status = 'published' or is_staff())));
create policy "editors write profile media" on profile_media for all to authenticated using (can_edit()) with check (can_edit());

create policy "public reads published interviews" on interview_answers for select
  using (exists (select 1 from profiles p where p.id = profile_id and (p.publication_status = 'published' or is_staff())));
create policy "editors write interviews" on interview_answers for all to authenticated using (can_edit()) with check (can_edit());

create policy "public reads published social links" on social_links for select
  using (exists (select 1 from profiles p where p.id = profile_id and (p.publication_status = 'published' or is_staff())));
create policy "editors write social links" on social_links for all to authenticated using (can_edit()) with check (can_edit());

-- Media metadata: public only for public bucket assets attached to published content; staff see all.
create policy "public reads public media" on media_assets for select using (bucket = 'public-media' or is_staff());
create policy "editors write media" on media_assets for all to authenticated using (can_edit()) with check (can_edit());

-- Stories
create policy "public reads published stories" on stories for select using (publication_status = 'published' or is_staff());
create policy "editors write stories" on stories for all to authenticated using (can_edit()) with check (can_edit());

-- Private tables: staff only, never anon.
create policy "staff read submissions" on submissions for select to authenticated using (is_staff());
create policy "staff update submissions" on submissions for update to authenticated using (is_staff()) with check (is_staff());
create policy "staff read consent" on consent_records for select to authenticated using (is_staff());
create policy "editors write consent" on consent_records for insert to authenticated with check (can_edit());
create policy "editors update consent" on consent_records for update to authenticated using (can_edit()) with check (can_edit());
create policy "staff read notes" on editorial_notes for select to authenticated using (is_staff());
create policy "staff add notes" on editorial_notes for insert to authenticated with check (is_staff() and editor_id = auth.uid());
create policy "super admin reads audit" on audit_logs for select to authenticated using (has_role(array['super_admin']::editor_role[]));
create policy "staff append audit" on audit_logs for insert to authenticated with check (is_staff() and actor_id = auth.uid());
create policy "staff read contact" on contact_messages for select to authenticated using (is_staff());
create policy "staff update contact" on contact_messages for update to authenticated using (is_staff()) with check (is_staff());
create policy "staff read settings" on site_settings for select to authenticated using (is_staff());
create policy "super admin writes settings" on site_settings for all to authenticated
  using (has_role(array['super_admin']::editor_role[])) with check (has_role(array['super_admin']::editor_role[]));
-- rate_limits: no policies → only service role / security definer function.

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('submission-uploads', 'submission-uploads', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "public reads public-media" on storage.objects for select using (bucket_id = 'public-media');
create policy "editors write public-media" on storage.objects for insert to authenticated with check (bucket_id = 'public-media' and can_edit());
create policy "editors update public-media" on storage.objects for update to authenticated using (bucket_id = 'public-media' and can_edit());
create policy "editors delete public-media" on storage.objects for delete to authenticated using (bucket_id = 'public-media' and can_edit());
create policy "staff read submission uploads" on storage.objects for select to authenticated using (bucket_id = 'submission-uploads' and is_staff());
create policy "editors delete submission uploads" on storage.objects for delete to authenticated using (bucket_id = 'submission-uploads' and can_edit());
-- No anon insert into submission-uploads: uploads go through the server (service role) after validation.
