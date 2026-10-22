alter table public.movies
  add column if not exists franchises text[] not null default '{}';

notify pgrst, 'reload schema';
