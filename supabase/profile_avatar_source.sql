alter table public.profiles
  add column if not exists avatar_source text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_avatar_source_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_avatar_source_check
      check (avatar_source is null or avatar_source in ('google', 'mythichq', 'upload'));
  end if;
end;
$$;

notify pgrst, 'reload schema';
