create table if not exists public.studio_watch_orders (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null,
  subtitle text default '',
  description text default '',
  background_url text,
  background_path text,
  display_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_watch_order_sagas (
  id uuid primary key default gen_random_uuid(),
  studio_watch_order_id uuid not null references public.studio_watch_orders(id) on delete cascade,
  name text not null,
  description text default '',
  cover_url text,
  cover_path text,
  display_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_watch_order_phases (
  id uuid primary key default gen_random_uuid(),
  studio_watch_order_id uuid not null references public.studio_watch_orders(id) on delete cascade,
  saga_id uuid references public.studio_watch_order_sagas(id) on delete cascade,
  name text not null,
  phase_number integer not null default 1,
  description text default '',
  background_url text,
  background_path text,
  display_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_watch_order_entries (
  id uuid primary key default gen_random_uuid(),
  studio_watch_order_id uuid not null references public.studio_watch_orders(id) on delete cascade,
  phase_id uuid not null references public.studio_watch_order_phases(id) on delete cascade,
  movie_id bigint references public.movies(id) on delete cascade,
  tv_show_id bigint references public.tv_shows(id) on delete cascade,
  title_override text,
  custom_note text,
  content_type text not null default 'movie' check (content_type in ('movie', 'tv_show')),
  release_label text,
  watch_number integer,
  position integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_watch_order_entries_one_title
    check (num_nonnulls(movie_id, tv_show_id) = 1)
);

create index if not exists studio_watch_order_studio_order_idx
  on public.studio_watch_orders (studio_id, display_order, created_at);
create index if not exists studio_watch_order_sagas_order_idx
  on public.studio_watch_order_sagas (studio_watch_order_id, display_order);
create index if not exists studio_watch_order_phases_order_idx
  on public.studio_watch_order_phases (studio_watch_order_id, saga_id, display_order, phase_number);
create index if not exists studio_watch_order_entries_phase_idx
  on public.studio_watch_order_entries (phase_id, position, is_visible);

alter table public.studio_watch_orders enable row level security;
alter table public.studio_watch_order_sagas enable row level security;
alter table public.studio_watch_order_phases enable row level security;
alter table public.studio_watch_order_entries enable row level security;

drop policy if exists "Anyone can view published studio watch orders" on public.studio_watch_orders;
create policy "Anyone can view published studio watch orders"
  on public.studio_watch_orders for select to anon, authenticated
  using (is_published or public.is_admin());

drop policy if exists "Anyone can view published studio watch order sagas" on public.studio_watch_order_sagas;
create policy "Anyone can view published studio watch order sagas"
  on public.studio_watch_order_sagas for select to anon, authenticated
  using (is_published or public.is_admin());

drop policy if exists "Anyone can view published studio watch order phases" on public.studio_watch_order_phases;
create policy "Anyone can view published studio watch order phases"
  on public.studio_watch_order_phases for select to anon, authenticated
  using (is_published or public.is_admin());

drop policy if exists "Anyone can view published studio watch order entries" on public.studio_watch_order_entries;
create policy "Anyone can view published studio watch order entries"
  on public.studio_watch_order_entries for select to anon, authenticated
  using (is_visible or public.is_admin());

drop policy if exists "Admins can manage studio watch orders" on public.studio_watch_orders;
create policy "Admins can manage studio watch orders"
  on public.studio_watch_orders for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage studio watch order sagas" on public.studio_watch_order_sagas;
create policy "Admins can manage studio watch order sagas"
  on public.studio_watch_order_sagas for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage studio watch order phases" on public.studio_watch_order_phases;
create policy "Admins can manage studio watch order phases"
  on public.studio_watch_order_phases for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage studio watch order entries" on public.studio_watch_order_entries;
create policy "Admins can manage studio watch order entries"
  on public.studio_watch_order_entries for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.studio_watch_orders, public.studio_watch_order_sagas, public.studio_watch_order_phases, public.studio_watch_order_entries to anon, authenticated;
grant insert, update, delete on public.studio_watch_orders, public.studio_watch_order_sagas, public.studio_watch_order_phases, public.studio_watch_order_entries to authenticated;

-- Realtime publication hook
 do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'studio_watch_orders') then alter publication supabase_realtime add table public.studio_watch_orders; end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'studio_watch_order_sagas') then alter publication supabase_realtime add table public.studio_watch_order_sagas; end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'studio_watch_order_phases') then alter publication supabase_realtime add table public.studio_watch_order_phases; end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'studio_watch_order_entries') then alter publication supabase_realtime add table public.studio_watch_order_entries; end if;
  end if;
end $$;
