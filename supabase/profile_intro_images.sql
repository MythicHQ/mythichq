create table if not exists public.profile_intro_images (
  id integer primary key default 1 check (id = 1),
  desktop_image_url text,
  desktop_storage_path text unique,
  mobile_image_url text,
  mobile_storage_path text unique,
  welcoming_image_url text,
  welcoming_storage_path text unique,
  updated_at timestamptz not null default now(),
  constraint profile_intro_images_device_urls_pair check (
    (desktop_image_url is not null or desktop_storage_path is null)
    and (mobile_image_url is not null or mobile_storage_path is null)
    and (welcoming_image_url is not null or welcoming_storage_path is null)
  )
);

alter table public.profile_intro_images
  add column if not exists welcoming_image_url text,
  add column if not exists welcoming_storage_path text unique;

alter table public.profile_intro_images
  drop constraint if exists profile_intro_images_device_urls_pair;
alter table public.profile_intro_images
  add constraint profile_intro_images_device_urls_pair check (
    (desktop_image_url is not null or desktop_storage_path is null)
    and (mobile_image_url is not null or mobile_storage_path is null)
    and (welcoming_image_url is not null or welcoming_storage_path is null)
  );

alter table public.profile_intro_images enable row level security;

drop policy if exists "Anyone can view profile intro images" on public.profile_intro_images;
create policy "Anyone can view profile intro images"
  on public.profile_intro_images for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can add profile intro images" on public.profile_intro_images;
create policy "Admins can add profile intro images"
  on public.profile_intro_images for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update profile intro images" on public.profile_intro_images;
create policy "Admins can update profile intro images"
  on public.profile_intro_images for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete profile intro images" on public.profile_intro_images;
create policy "Admins can delete profile intro images"
  on public.profile_intro_images for delete
  to authenticated
  using (public.is_admin());

revoke all on public.profile_intro_images from anon, authenticated;
grant select on public.profile_intro_images to anon, authenticated;
grant insert, update, delete on public.profile_intro_images to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-intro-images',
  'profile-intro-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view profile intro image files" on storage.objects;
create policy "Anyone can view profile intro image files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'profile-intro-images');

drop policy if exists "Admins can upload profile intro image files" on storage.objects;
create policy "Admins can upload profile intro image files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'profile-intro-images' and public.is_admin());

drop policy if exists "Admins can update profile intro image files" on storage.objects;
create policy "Admins can update profile intro image files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'profile-intro-images' and public.is_admin())
  with check (bucket_id = 'profile-intro-images' and public.is_admin());

drop policy if exists "Admins can delete profile intro image files" on storage.objects;
create policy "Admins can delete profile intro image files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-intro-images' and public.is_admin());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'profile_intro_images'
    )
  then
    alter publication supabase_realtime add table public.profile_intro_images;
  end if;
end;
$$;
