alter table public.hero_tv_shows
  add column if not exists home_position integer not null default 0;

create index if not exists hero_tv_shows_home_position_idx
  on public.hero_tv_shows (home_position);

update public.hero_tv_shows
set home_position = position
where home_position = 0 and position > 0;

create or replace function public.set_hero_tv_home_position()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.home_position <= 0 then
    perform pg_advisory_xact_lock(hashtextextended('home-hero:', 0));
    select greatest(
      coalesce((select max(position) from public.hero_movies), 0),
      coalesce((select max(home_position) from public.hero_tv_shows), 0)
    ) + 1
      into new.home_position;
  end if;
  return new;
end;
$$;

drop trigger if exists hero_tv_shows_home_position_insert on public.hero_tv_shows;
create trigger hero_tv_shows_home_position_insert
before insert on public.hero_tv_shows
for each row execute function public.set_hero_tv_home_position();

create or replace function public.admin_move_item_position(
  p_scope text,
  p_item_id text,
  p_target_position integer,
  p_record_type text default null,
  p_parent_id text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_keys text[];
  v_item_key text;
  v_current integer;
  v_target integer;
  v_count integer;
  v_index integer;
  v_source_index integer;
  v_key text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change item positions.' using errcode = '42501';
  end if;
  if p_target_position is null or p_target_position < 1 then
    raise exception 'Position must be a positive whole number.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_scope || ':' || coalesce(p_parent_id, ''),
    0
  ));

  if p_scope = 'curated:trending' then
    select array_agg(item_key order by item_position, record_type, item_id)
      into v_keys
    from (
      select 'movie:' || id::text as item_key, 'movie' as record_type, id::text as item_id, trending_position as item_position
      from public.movies
      where is_published and trending_now
      union all
      select 'tv_show:' || id::text, 'tv_show', id::text, trending_position
      from public.tv_shows
      where is_published and is_trending
    ) items;
  elsif p_scope = 'curated:top-rated-masterpieces' then
    select array_agg('movie:' || id::text order by top_rated_masterpieces_position, id::text)
      into v_keys
    from public.movies
    where is_published and top_rated_masterpieces;
  elsif p_scope = 'curated:hidden-gems' then
    select array_agg('movie:' || id::text order by hidden_gems_position, id::text)
      into v_keys
    from public.movies
    where is_published and hidden_gems;
  elsif p_scope = 'home-hero' then
    select array_agg(item_key order by item_position, record_type, item_id)
      into v_keys
    from (
      select 'movie:' || movie_id::text as item_key, 'movie' as record_type, movie_id::text as item_id, position as item_position
      from public.hero_movies
      union all
      select 'tv_show:' || tv_show_id::text, 'tv_show', tv_show_id::text, home_position
      from public.hero_tv_shows
    ) items;
  elsif p_scope = 'tv-page-hero' then
    select array_agg('tv_show:' || tv_show_id::text order by position, tv_show_id::text)
      into v_keys
    from public.hero_tv_shows;
  elsif p_scope = 'studio-phase-movies' then
    if p_parent_id is null then raise exception 'A phase is required to reorder its movies.' using errcode = '22023'; end if;
    select array_agg('assignment:' || id::text order by watch_order, id::text)
      into v_keys
    from public.studio_phase_movies
    where phase_id = p_parent_id::uuid;
  elsif p_scope = 'studio-phases' then
    if p_parent_id is null then raise exception 'A studio is required to reorder its phases.' using errcode = '22023'; end if;
    select array_agg('phase:' || id::text order by display_order, phase_number, id::text)
      into v_keys
    from public.studio_phases
    where studio_id = p_parent_id::uuid;
  else
    raise exception 'Unsupported position scope.' using errcode = '22023';
  end if;

  v_count := coalesce(array_length(v_keys, 1), 0);
  if v_count = 0 then raise exception 'There are no items in this ordered list.' using errcode = '22023'; end if;
  v_item_key := coalesce(p_record_type, 'movie') || ':' || p_item_id;
  v_current := array_position(v_keys, v_item_key);
  if v_current is null then raise exception 'The item is no longer in this ordered list. Refresh and try again.' using errcode = '22023'; end if;

  v_target := least(p_target_position, v_count);
  if v_current = v_target then return v_target; end if;

  for v_index in 1..v_count loop
    if v_index = v_target then
      v_source_index := v_current;
    elsif v_current < v_target and v_index >= v_current and v_index < v_target then
      v_source_index := v_index + 1;
    elsif v_current > v_target and v_index > v_target and v_index <= v_current then
      v_source_index := v_index - 1;
    else
      v_source_index := v_index;
    end if;
    v_key := v_keys[v_source_index];

    if p_scope = 'curated:trending' then
      if split_part(v_key, ':', 1) = 'tv_show' then
        update public.tv_shows set trending_position = v_index where id::text = split_part(v_key, ':', 2);
      else
        update public.movies set trending_position = v_index where id::text = split_part(v_key, ':', 2);
      end if;
    elsif p_scope = 'curated:top-rated-masterpieces' then
      update public.movies set top_rated_masterpieces_position = v_index where id::text = split_part(v_key, ':', 2);
    elsif p_scope = 'curated:hidden-gems' then
      update public.movies set hidden_gems_position = v_index where id::text = split_part(v_key, ':', 2);
    elsif p_scope = 'home-hero' then
      if split_part(v_key, ':', 1) = 'tv_show' then
        update public.hero_tv_shows set home_position = v_index where tv_show_id::text = split_part(v_key, ':', 2);
      else
        update public.hero_movies set position = v_index where movie_id::text = split_part(v_key, ':', 2);
      end if;
    elsif p_scope = 'tv-page-hero' then
      update public.hero_tv_shows set position = v_index where tv_show_id::text = split_part(v_key, ':', 2);
    elsif p_scope = 'studio-phase-movies' then
      update public.studio_phase_movies set watch_order = v_index where id::text = split_part(v_key, ':', 2);
    elsif p_scope = 'studio-phases' then
      update public.studio_phases set display_order = v_index - 1 where id::text = split_part(v_key, ':', 2);
    end if;
  end loop;

  return v_target;
end;
$$;

revoke all on function public.admin_move_item_position(text, text, integer, text, text) from public;
grant execute on function public.admin_move_item_position(text, text, integer, text, text) to authenticated;

notify pgrst, 'reload schema';
