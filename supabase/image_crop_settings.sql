create table if not exists public.image_crop_settings (
  image_key text primary key,
  settings jsonb not null default '{"x":50,"y":50,"zoom":1,"aspectRatio":"original"}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.image_crop_settings enable row level security;

drop policy if exists "Anyone can view image crop settings" on public.image_crop_settings;
create policy "Anyone can view image crop settings"
  on public.image_crop_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage image crop settings" on public.image_crop_settings;
create policy "Admins can manage image crop settings"
  on public.image_crop_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.image_crop_settings to anon, authenticated;
grant insert, update, delete on public.image_crop_settings to authenticated;
