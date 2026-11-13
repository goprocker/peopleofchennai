-- People of Chennai — development seed
-- ⚠ All people below are FICTIONAL samples for local development (is_sample = true).
-- They are rendered with a visible "Sample profile" label and must be removed before launch:
--   delete from stories where is_sample; delete from profiles where is_sample;

insert into categories (name, slug, description, display_order) values
  ('Arts & Culture', 'arts-culture', 'Musicians, dancers, painters and keepers of tradition.', 1),
  ('Founders & Builders', 'founders-builders', 'People starting things — companies, collectives, movements.', 2),
  ('Students & Researchers', 'students-researchers', 'Curious minds in classrooms, labs and libraries.', 3),
  ('Creators & Designers', 'creators-designers', 'Makers of images, interfaces, objects and ideas.', 4),
  ('Community Heroes', 'community-heroes', 'Volunteers, organisers and quiet helpers.', 5),
  ('Small Businesses', 'small-businesses', 'Shopkeepers, vendors, artisans and family trades.', 6),
  ('Sports & Performance', 'sports-performance', 'Athletes, coaches and performers.', 7),
  ('Everyday Chennai', 'everyday-chennai', 'Ordinary days, extraordinary people.', 8)
on conflict (slug) do nothing;

insert into neighbourhoods (name, slug) values
  ('Mylapore', 'mylapore'), ('Adyar', 'adyar'), ('T. Nagar', 't-nagar'), ('Anna Nagar', 'anna-nagar'),
  ('Velachery', 'velachery'), ('Tambaram', 'tambaram'), ('Besant Nagar', 'besant-nagar'),
  ('Royapettah', 'royapettah'), ('Nungambakkam', 'nungambakkam'), ('Triplicane', 'triplicane')
on conflict (slug) do nothing;

insert into site_settings (key, value) values
  ('submissions_open', 'true'::jsonb),
  ('consent_version', '"2026-11-v1"'::jsonb),
  ('editor_notification_emails', '[]'::jsonb)
on conflict (key) do nothing;

-- Sample portraits live in /public/images/samples and are referenced with the "sample/" prefix.
insert into media_assets (id, bucket, storage_path, original_filename, mime_type, file_size, width, height, alt_text) values
  ('00000000-0000-4000-a000-000000000001', 'public-media', 'sample/portrait-1.svg', 'portrait-1.svg', 'image/svg+xml', 1, 800, 1000, 'Illustrated placeholder portrait in terracotta tones'),
  ('00000000-0000-4000-a000-000000000002', 'public-media', 'sample/portrait-2.svg', 'portrait-2.svg', 'image/svg+xml', 1, 800, 1000, 'Illustrated placeholder portrait in sage tones'),
  ('00000000-0000-4000-a000-000000000003', 'public-media', 'sample/portrait-3.svg', 'portrait-3.svg', 'image/svg+xml', 1, 800, 1000, 'Illustrated placeholder portrait in sand tones'),
  ('00000000-0000-4000-a000-000000000004', 'public-media', 'sample/portrait-4.svg', 'portrait-4.svg', 'image/svg+xml', 1, 800, 1000, 'Illustrated placeholder portrait in ink tones'),
  ('00000000-0000-4000-a000-000000000005', 'public-media', 'sample/portrait-5.svg', 'portrait-5.svg', 'image/svg+xml', 1, 800, 1000, 'Illustrated placeholder portrait in terracotta and sand'),
  ('00000000-0000-4000-a000-000000000006', 'public-media', 'sample/portrait-6.svg', 'portrait-6.svg', 'image/svg+xml', 1, 800, 1000, 'Illustrated placeholder portrait in sage and ink')
on conflict (id) do nothing;

with p as (
  insert into profiles (id, slug, full_name, headline, short_bio, story_introduction, story_journey, story_chennai, pull_quote,
                        neighbourhood_id, portrait_media_id, is_sample, featured, publication_status, published_at)
  values
    ('10000000-0000-4000-a000-000000000001', 'sample-meera-the-veena-teacher', 'Meera (Sample)', 'A veena teacher who keeps evening classes free for neighbourhood kids',
     'Fictional sample profile used for development. Meera teaches veena from a terrace room.', 'This is a fictional sample used to preview layouts.',
     'In this sample story, Meera began teaching after her own teacher retired.', 'For this sample, Chennai is the sound of temple bells at dusk.', 'Music is the one thing you can give away and still keep.',
     (select id from neighbourhoods where slug = 'mylapore'), '00000000-0000-4000-a000-000000000001', true, true, 'published', now() - interval '2 days'),
    ('10000000-0000-4000-a000-000000000002', 'sample-arjun-the-repair-shop', 'Arjun (Sample)', 'Runs a phone repair stall that doubles as a free coding corner',
     'Fictional sample profile used for development.', 'This is a fictional sample used to preview layouts.',
     'In this sample story, Arjun learned electronics from discarded radios.', 'For this sample, Chennai is crowded, kind and always open late.', 'Everything broken is just a puzzle with a deadline.',
     (select id from neighbourhoods where slug = 't-nagar'), '00000000-0000-4000-a000-000000000002', true, true, 'published', now() - interval '4 days'),
    ('10000000-0000-4000-a000-000000000003', 'sample-kavya-the-marine-researcher', 'Kavya (Sample)', 'Counts sea turtle nests on early-morning beach walks',
     'Fictional sample profile used for development.', 'This is a fictional sample used to preview layouts.',
     'In this sample story, Kavya joined a volunteer walk and never stopped.', 'For this sample, Chennai is the coastline at 5 a.m.', 'The sea keeps its own calendar. We just try to read it.',
     (select id from neighbourhoods where slug = 'besant-nagar'), '00000000-0000-4000-a000-000000000003', true, true, 'published', now() - interval '6 days'),
    ('10000000-0000-4000-a000-000000000004', 'sample-rahim-the-tea-stall', 'Rahim (Sample)', 'Thirty years of tea and the best conversations on the street',
     'Fictional sample profile used for development.', 'This is a fictional sample used to preview layouts.',
     null, 'For this sample, Chennai is a glass of tea shared between strangers.', null,
     (select id from neighbourhoods where slug = 'triplicane'), '00000000-0000-4000-a000-000000000004', true, false, 'published', now() - interval '8 days'),
    ('10000000-0000-4000-a000-000000000005', 'sample-divya-the-type-designer', 'Divya (Sample)', 'Designs Tamil typefaces for screens',
     'Fictional sample profile used for development.', 'This is a fictional sample used to preview layouts.',
     null, null, null,
     (select id from neighbourhoods where slug = 'adyar'), '00000000-0000-4000-a000-000000000005', true, false, 'published', now() - interval '10 days'),
    ('10000000-0000-4000-a000-000000000006', 'sample-sanjay-the-kabaddi-coach', 'Sanjay (Sample)', 'Coaches a kabaddi team that practises under streetlights',
     'Fictional sample profile used for development.', 'This is a fictional sample used to preview layouts.',
     null, null, null,
     (select id from neighbourhoods where slug = 'tambaram'), '00000000-0000-4000-a000-000000000006', true, false, 'published', now() - interval '12 days'),
    ('10000000-0000-4000-a000-000000000007', 'sample-draft-profile', 'Draft Person (Sample)', 'An unpublished draft that must never appear publicly',
     'Fictional draft used to test that unpublished content stays private.', null, null, null, null,
     (select id from neighbourhoods where slug = 'velachery'), null, true, false, 'draft', null)
  on conflict (id) do nothing
  returning id, slug
)
insert into profile_categories (profile_id, category_id)
select p.id, c.id from p join categories c on c.slug = case p.slug
  when 'sample-meera-the-veena-teacher' then 'arts-culture'
  when 'sample-arjun-the-repair-shop' then 'small-businesses'
  when 'sample-kavya-the-marine-researcher' then 'students-researchers'
  when 'sample-rahim-the-tea-stall' then 'everyday-chennai'
  when 'sample-divya-the-type-designer' then 'creators-designers'
  when 'sample-sanjay-the-kabaddi-coach' then 'sports-performance'
  else 'everyday-chennai' end
on conflict do nothing;

insert into interview_answers (profile_id, question, answer, display_order) values
  ('10000000-0000-4000-a000-000000000001', 'How did your journey begin?', 'Sample answer: with a borrowed instrument and a patient teacher.', 1),
  ('10000000-0000-4000-a000-000000000001', 'What does Chennai mean to you?', 'Sample answer: a city that listens.', 2)
on conflict do nothing;

insert into stories (id, profile_id, slug, title, excerpt, body_json, cover_media_id, is_sample, featured, publication_status, published_at) values
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'sample-terrace-music-room',
   'The terrace room where music is free', 'A fictional sample story used to preview the long-form layout.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This is a fictional sample story for development. Replace it with real, consented editorial content before launch."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Evenings"}]},{"type":"paragraph","content":[{"type":"text","text":"Sample paragraph describing an evening class."}]},{"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"Music is the one thing you can give away and still keep."}]}]}]}'::jsonb,
   '00000000-0000-4000-a000-000000000001', true, true, 'published', now() - interval '2 days'),
  ('20000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000003', 'sample-turtle-walks',
   'Before sunrise, on the turtle walk', 'A fictional sample story used to preview the long-form layout.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This is a fictional sample story for development."}]}]}'::jsonb,
   '00000000-0000-4000-a000-000000000003', true, false, 'published', now() - interval '6 days')
on conflict (id) do nothing;
