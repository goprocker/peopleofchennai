-- People directory search: prefix-matching full-text search + filters + pagination in one call.
-- SECURITY INVOKER: RLS still applies, and we additionally require publication_status = 'published'.
create or replace function search_people(
  p_q text default null,
  p_category text default null,
  p_neighbourhood text default null,
  p_sort text default 'recent',
  p_limit int default 12,
  p_offset int default 0
)
returns table (id uuid, total bigint)
language sql stable security invoker set search_path = public as $$
  with terms as (
    select (
      select string_agg(quote_literal(w) || ':*', ' & ')
      from regexp_split_to_table(
        lower(regexp_replace(coalesce(trim(p_q), ''), '[^[:alnum:][:space:]]', ' ', 'g')), '\s+'
      ) as w
      where w <> ''
    ) as raw
  ),
  q as (
    select
      case when raw is null then null else to_tsquery('simple', raw) end as sq,
      case when raw is null then null else to_tsquery('english', raw) end as eq
    from terms
  )
  select p.id, count(*) over () as total
  from profiles p
  cross join q
  left join neighbourhoods n on n.id = p.neighbourhood_id
  where p.publication_status = 'published'
    and (q.sq is null or p.search_vector @@ q.sq or p.search_vector @@ q.eq)
    and (p_category is null or exists (
      select 1 from profile_categories pc join categories c on c.id = pc.category_id
      where pc.profile_id = p.id and c.slug = p_category and c.active
    ))
    and (p_neighbourhood is null or (n.slug = p_neighbourhood and n.active))
  order by
    case when p_sort = 'name' then p.full_name end asc,
    case when q.sq is not null and p_sort <> 'name' then ts_rank(p.search_vector, q.sq) + ts_rank(p.search_vector, q.eq) end desc nulls last,
    p.published_at desc nulls last,
    p.id
  limit least(greatest(p_limit, 1), 48)
  offset greatest(p_offset, 0);
$$;
grant execute on function search_people(text, text, text, text, int, int) to anon, authenticated;
