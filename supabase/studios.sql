create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  website_url text,
  logo_url text,
  logo_path text,
  background_url text,
  background_path text,
  franchise_background_movie_ids jsonb not null default '{}'::jsonb,
  background_color text not null default '#171a24',
  overlay_opacity numeric not null default 0.48 check (overlay_opacity >= 0 and overlay_opacity <= 0.9),
  logo_position text not null default 'center' check (logo_position in ('left', 'center', 'right')),
  text_position text not null default 'left' check (text_position in ('left', 'center', 'right')),
  display_order integer not null default 0,
  is_featured boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studios
  add column if not exists website_url text;

alter table public.studios
  add column if not exists franchise_background_movie_ids jsonb not null default '{}'::jsonb;

create table if not exists public.studio_home_settings (
  id boolean primary key default true check (id),
  featured_limit integer not null default 6 check (featured_limit between 4 and 6),
  updated_at timestamptz not null default now()
);
insert into public.studio_home_settings (id, featured_limit) values (true, 6) on conflict (id) do nothing;

insert into public.studios (name, slug, description, background_color, display_order, is_featured, is_active) values
  ('Marvel Studios', 'marvel-studios', 'Superhero stories from the Marvel Cinematic Universe.', '#5d1722', 1, true, true),
  ('Warner Bros. Pictures', 'warner-bros-pictures', 'Epic stories and unforgettable worlds from Warner Bros.', '#153d70', 2, true, true),
  ('Universal Pictures', 'universal-pictures', 'Big-screen entertainment from Universal Pictures.', '#1b3168', 3, true, true),
  ('Sony Pictures', 'sony-pictures', 'Stories from Sony Pictures and its studios.', '#263860', 4, true, true),
  ('Paramount Pictures', 'paramount-pictures', 'Iconic films from Paramount Pictures.', '#244a86', 5, true, true),
  ('20th Century Studios', '20th-century-studios', 'Big stories from 20th Century Studios.', '#59422e', 6, true, true)
on conflict (name) do nothing;

alter table public.studios enable row level security;
alter table public.studio_home_settings enable row level security;
drop policy if exists "Anyone can view active studios" on public.studios;
create policy "Anyone can view active studios" on public.studios for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists "Admins can manage studios" on public.studios;
create policy "Admins can manage studios" on public.studios for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Anyone can view studio home settings" on public.studio_home_settings;
create policy "Anyone can view studio home settings" on public.studio_home_settings for select to anon, authenticated using (true);
drop policy if exists "Admins can manage studio home settings" on public.studio_home_settings;
create policy "Admins can manage studio home settings" on public.studio_home_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.studios, public.studio_home_settings to anon, authenticated;
grant insert, update, delete on public.studios, public.studio_home_settings to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('studio-images', 'studio-images', true, 8388608, array['image/jpeg','image/png','image/webp']) on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Anyone can view studio images" on storage.objects;
create policy "Anyone can view studio images" on storage.objects for select to anon, authenticated using (bucket_id = 'studio-images');
drop policy if exists "Admins can manage studio images" on storage.objects;
create policy "Admins can manage studio images" on storage.objects for all to authenticated using (bucket_id = 'studio-images' and public.is_admin()) with check (bucket_id = 'studio-images' and public.is_admin());

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'studios') then alter publication supabase_realtime add table public.studios; end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'studio_home_settings') then alter publication supabase_realtime add table public.studio_home_settings; end if;
end $$;

create table if not exists public.content_studio_assignments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  movie_id bigint references public.movies(id) on delete cascade,
  tv_show_id bigint references public.tv_shows(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint content_studio_assignments_one_title
    check (num_nonnulls(movie_id, tv_show_id) = 1)
);

create unique index if not exists content_studio_assignments_movie_unique
  on public.content_studio_assignments (studio_id, movie_id)
  where movie_id is not null;
create unique index if not exists content_studio_assignments_tv_show_unique
  on public.content_studio_assignments (studio_id, tv_show_id)
  where tv_show_id is not null;
create index if not exists content_studio_assignments_studio_idx
  on public.content_studio_assignments (studio_id);

insert into public.content_studio_assignments (studio_id, movie_id)
select distinct s.id, m.id
from public.movies m
cross join lateral regexp_split_to_table(coalesce(m.production_company, ''), '[,;|/]')
  as split(company_name)
join public.studios s on lower(trim(split.company_name)) = lower(s.name)
where trim(split.company_name) <> ''
  and not exists (
    select 1 from public.content_studio_assignments a
    where a.studio_id = s.id and a.movie_id = m.id
  );

insert into public.content_studio_assignments (studio_id, tv_show_id)
select distinct s.id, t.id
from public.tv_shows t
cross join lateral regexp_split_to_table(coalesce(t.production_company, ''), '[,;|/]')
  as split(company_name)
join public.studios s on lower(trim(split.company_name)) = lower(s.name)
where trim(split.company_name) <> ''
  and not exists (
    select 1 from public.content_studio_assignments a
    where a.studio_id = s.id and a.tv_show_id = t.id
  );

alter table public.content_studio_assignments enable row level security;

drop policy if exists "Public can view published content studio assignments"
  on public.content_studio_assignments;
create policy "Public can view published content studio assignments"
  on public.content_studio_assignments for select to anon, authenticated
  using (
    public.is_admin()
    or (
      exists (
        select 1 from public.studios s
        where s.id = studio_id and s.is_active
      )
      and (
        exists (
          select 1 from public.movies m
          where m.id = movie_id and m.is_published
        )
        or exists (
          select 1 from public.tv_shows t
          where t.id = tv_show_id and t.is_published
        )
      )
    )
  );

drop policy if exists "Admins can manage content studio assignments"
  on public.content_studio_assignments;
create policy "Admins can manage content studio assignments"
  on public.content_studio_assignments for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.content_studio_assignments to anon, authenticated;
grant insert, update, delete on public.content_studio_assignments to authenticated;

create or replace function public.set_content_studio_assignments(
  p_content_type text,
  p_content_id bigint,
  p_studio_ids uuid[]
)
returns void
language plpgsql
set search_path = public
as $$
declare
  requested_ids uuid[] := coalesce(p_studio_ids, '{}'::uuid[]);
  distinct_ids uuid[];
  matched_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can assign studios.';
  end if;
  if p_content_type not in ('movie', 'tv_show') or p_content_id is null then
    raise exception 'Invalid content type or ID.';
  end if;

  select coalesce(array_agg(distinct studio_id), '{}'::uuid[])
    into distinct_ids
    from unnest(requested_ids) as ids(studio_id);

  select count(*) into matched_count
    from public.studios
    where id = any(distinct_ids);
  if matched_count <> cardinality(distinct_ids) then
    raise exception 'One or more selected studios no longer exist.';
  end if;

  if p_content_type = 'movie' then
    delete from public.content_studio_assignments where movie_id = p_content_id;
    insert into public.content_studio_assignments (studio_id, movie_id)
      select studio_id, p_content_id from unnest(distinct_ids) as ids(studio_id);
  else
    delete from public.content_studio_assignments where tv_show_id = p_content_id;
    insert into public.content_studio_assignments (studio_id, tv_show_id)
      select studio_id, p_content_id from unnest(distinct_ids) as ids(studio_id);
  end if;
end;
$$;

revoke all on function public.set_content_studio_assignments(text, bigint, uuid[]) from public;
grant execute on function public.set_content_studio_assignments(text, bigint, uuid[]) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'content_studio_assignments'
    ) then
    alter publication supabase_realtime add table public.content_studio_assignments;
  end if;
end $$;
