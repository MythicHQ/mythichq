create table if not exists public.studio_phases (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  phase_number integer not null check (phase_number > 0),
  title text not null,
  description text not null default '',
  image_url text,
  image_path text,
  release_period text,
  display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_phases_studio_number_unique unique (studio_id, phase_number)
);

alter table public.studio_phases add column if not exists image_path text;

create table if not exists public.studio_phase_movies (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.studio_phases(id) on delete cascade,
  movie_id bigint not null references public.movies(id) on delete cascade,
  watch_order integer not null default 1 check (watch_order > 0),
  custom_label text,
  watch_note text,
  is_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_phase_movies_unique_title unique (phase_id, movie_id)
);

create index if not exists studio_phases_studio_order_idx
  on public.studio_phases (studio_id, display_order, phase_number);
create index if not exists studio_phases_status_idx
  on public.studio_phases (status, studio_id);
create index if not exists studio_phase_movies_order_idx
  on public.studio_phase_movies (phase_id, watch_order);

alter table public.studio_phases enable row level security;
alter table public.studio_phase_movies enable row level security;

drop policy if exists "Anyone can view published studio phases" on public.studio_phases;
create policy "Anyone can view published studio phases"
  on public.studio_phases for select to anon, authenticated
  using (
    (status = 'published' and exists (
      select 1 from public.studios s where s.id = studio_phases.studio_id and s.is_active
    ))
    or public.is_admin()
  );

drop policy if exists "Admins can manage studio phases" on public.studio_phases;
create policy "Admins can manage studio phases"
  on public.studio_phases for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Anyone can view movies in published studio phases" on public.studio_phase_movies;
create policy "Anyone can view movies in published studio phases"
  on public.studio_phase_movies for select to anon, authenticated
  using (
    exists (
      select 1 from public.studio_phases p
      join public.studios s on s.id = p.studio_id
      join public.movies m on m.id = studio_phase_movies.movie_id
      where p.id = studio_phase_movies.phase_id and p.status = 'published' and s.is_active and m.is_published
    )
    or public.is_admin()
  );

drop policy if exists "Admins can manage studio phase movies" on public.studio_phase_movies;
create policy "Admins can manage studio phase movies"
  on public.studio_phase_movies for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.studio_phases, public.studio_phase_movies to anon, authenticated;
grant insert, update, delete on public.studio_phases, public.studio_phase_movies to authenticated;

create or replace function public.set_studio_phase_order(p_phase_ids uuid[])
returns void
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reorder studio phases.' using errcode = '42501';
  end if;

  update public.studio_phases phase
  set display_order = requested.position::integer,
      updated_at = now()
  from unnest(p_phase_ids) with ordinality as requested(id, position)
  where phase.id = requested.id;
end;
$$;

create or replace function public.set_studio_phase_movie_order(p_assignment_ids uuid[])
returns void
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reorder studio phase movies.' using errcode = '42501';
  end if;

  update public.studio_phase_movies assignment
  set watch_order = requested.position::integer,
      updated_at = now()
  from unnest(p_assignment_ids) with ordinality as requested(id, position)
  where assignment.id = requested.id;
end;
$$;

revoke all on function public.set_studio_phase_order(uuid[]) from public;
revoke all on function public.set_studio_phase_movie_order(uuid[]) from public;
grant execute on function public.set_studio_phase_order(uuid[]) to authenticated;
grant execute on function public.set_studio_phase_movie_order(uuid[]) to authenticated;
