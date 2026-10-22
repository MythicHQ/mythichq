alter table public.profiles
  add column if not exists profile_completed boolean not null default true;
alter table public.profiles
  add column if not exists avatar_source text check (avatar_source in ('google', 'mythichq', 'upload'));

update public.profiles as profiles
set avatar_url = coalesce(
      profiles.avatar_url,
      nullif(users.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(users.raw_user_meta_data ->> 'picture', '')
    ),
    avatar_source = case
      when profiles.avatar_source is null
        and (
          profiles.avatar_url is null
          or profiles.avatar_url = coalesce(
            nullif(users.raw_user_meta_data ->> 'avatar_url', ''),
            nullif(users.raw_user_meta_data ->> 'picture', '')
          )
        )
      then 'google'
      else profiles.avatar_source
    end
from auth.users as users
where users.id = profiles.id
  and (
    users.raw_app_meta_data ->> 'provider' = 'google'
    or users.raw_app_meta_data -> 'providers' ? 'google'
  )
  and (
    profiles.avatar_url is null
    or (
      profiles.avatar_source is null
      and profiles.avatar_url = coalesce(
        nullif(users.raw_user_meta_data ->> 'avatar_url', ''),
        nullif(users.raw_user_meta_data ->> 'picture', '')
      )
    )
  )
  and coalesce(
    nullif(users.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(users.raw_user_meta_data ->> 'picture', '')
  ) is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    username,
    full_name,
    bio,
    avatar_url,
    avatar_source,
    youtube_url,
    instagram_url,
    x_url,
    website_url,
    favorite_genres,
    profile_completed
  )
  values (
    new.id,
    new.email,
    null,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'bio', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'avatar_url', ''), nullif(new.raw_user_meta_data ->> 'picture', '')),
    case
      when (
        new.raw_app_meta_data ->> 'provider' = 'google'
        or new.raw_app_meta_data -> 'providers' ? 'google'
      )
      and coalesce(nullif(new.raw_user_meta_data ->> 'avatar_url', ''), nullif(new.raw_user_meta_data ->> 'picture', '')) is not null
      then 'google'
      else null
    end,
    coalesce(new.raw_user_meta_data ->> 'youtube_url', ''),
    coalesce(new.raw_user_meta_data ->> 'instagram_url', ''),
    coalesce(new.raw_user_meta_data ->> 'x_url', ''),
    coalesce(new.raw_user_meta_data ->> 'website_url', ''),
    coalesce(new.raw_user_meta_data ->> 'favorite_genres', ''),
    false
  )
  on conflict (id) do update
    set email = excluded.email,
        avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url),
        avatar_source = coalesce(profiles.avatar_source, excluded.avatar_source),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

with ranked_usernames as (
  select
    id,
    username,
    row_number() over (partition by lower(btrim(username)) order by created_at, id) as duplicate_number
  from public.profiles
  where nullif(btrim(username), '') is not null
)
update public.profiles as profiles
set username = left(btrim(ranked_usernames.username), 52) || '-' || left(ranked_usernames.id::text, 8),
    updated_at = now()
from ranked_usernames
where ranked_usernames.id = profiles.id
  and ranked_usernames.duplicate_number > 1;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(btrim(username)))
  where nullif(btrim(username), '') is not null;

create or replace function public.is_profile_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    auth.uid() is not null
    and candidate ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{2,19}$'
    and not exists (
      select 1
      from public.profiles
      where lower(btrim(username)) = lower(btrim(candidate))
        and id <> auth.uid()
    ),
    false
  );
$$;

revoke all on function public.is_profile_username_available(text) from public;
grant execute on function public.is_profile_username_available(text) to authenticated;

notify pgrst, 'reload schema';
