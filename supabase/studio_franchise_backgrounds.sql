alter table public.studios
  add column if not exists franchise_background_movie_ids jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
