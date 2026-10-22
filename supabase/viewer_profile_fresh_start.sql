-- Apply once in the Supabase SQL editor for dynamic profile counts and per-profile starts.
alter table public.viewer_profiles
  add column if not exists onboarding_completed boolean not null default true,
  add column if not exists favorite_genres text not null default '';

-- Existing viewer profiles stay completed; newly created profiles are marked incomplete by the app.
update public.viewer_profiles set onboarding_completed = true where onboarding_completed is null;

alter table public.watchlist_items
  add column if not exists viewer_profile_id uuid references public.viewer_profiles(id) on delete cascade;

-- Keep existing account watchlists with the account's earliest profile.
update public.watchlist_items as item
set viewer_profile_id = (
  select vp.id
  from public.viewer_profiles as vp
  where vp.user_id = item.user_id
  order by vp.created_at asc, vp.id asc
  limit 1
)
where item.viewer_profile_id is null;

alter table public.watchlist_items
  drop constraint if exists watchlist_items_user_id_movie_id_key;

create unique index if not exists watchlist_items_viewer_profile_movie_unique
  on public.watchlist_items (viewer_profile_id, movie_id)
  where viewer_profile_id is not null;

drop policy if exists "Users can add to their watchlist" on public.watchlist_items;
create policy "Users can add to their watchlist"
  on public.watchlist_items for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.viewer_profiles vp
      where vp.id = viewer_profile_id and vp.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their watchlist" on public.watchlist_items;
create policy "Users can update their watchlist"
  on public.watchlist_items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.viewer_profiles vp
      where vp.id = viewer_profile_id and vp.user_id = auth.uid()
    )
  );

create or replace function public.enforce_viewer_profile_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_count integer;
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'Viewer profiles can only be managed by their owner.'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.user_id::text, 0)
    );
    select count(*) into profile_count
    from public.viewer_profiles
    where user_id = new.user_id;
    if profile_count >= 10 then
      raise exception 'An account can have at most 10 viewer profiles.'
        using errcode = '23514';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.enforce_viewer_profile_limit() from public, anon, authenticated;
notify pgrst, 'reload schema';
