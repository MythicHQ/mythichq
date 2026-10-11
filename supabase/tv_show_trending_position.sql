alter table public.tv_shows
  add column if not exists trending_position integer not null default 0;
