alter table public.tv_shows
  add column if not exists slug text not null default '',
  add column if not exists keywords text[] not null default '{}',
  add column if not exists tags text[] not null default '{}',
  add column if not exists meta_description text not null default '';

notify pgrst, 'reload schema';
