create table if not exists public.browse_category_images (
  category_id integer primary key,
  image_url text not null,
  storage_path text not null unique,
  updated_at timestamptz not null default now()
);

alter table public.browse_category_images enable row level security;

drop policy if exists "Anyone can view browse category images" on public.browse_category_images;
create policy "Anyone can view browse category images"
  on public.browse_category_images for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can add browse category images" on public.browse_category_images;
create policy "Admins can add browse category images"
  on public.browse_category_images for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update browse category images" on public.browse_category_images;
create policy "Admins can update browse category images"
  on public.browse_category_images for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete browse category images" on public.browse_category_images;
create policy "Admins can delete browse category images"
  on public.browse_category_images for delete
  to authenticated
  using (public.is_admin());

grant select on public.browse_category_images to anon, authenticated;
grant insert, update, delete on public.browse_category_images to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'browse-category-images',
  'browse-category-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view browse category image files" on storage.objects;
create policy "Anyone can view browse category image files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'browse-category-images');

drop policy if exists "Admins can upload browse category image files" on storage.objects;
create policy "Admins can upload browse category image files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'browse-category-images' and public.is_admin());

drop policy if exists "Admins can update browse category image files" on storage.objects;
create policy "Admins can update browse category image files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'browse-category-images' and public.is_admin())
  with check (bucket_id = 'browse-category-images' and public.is_admin());

drop policy if exists "Admins can delete browse category image files" on storage.objects;
create policy "Admins can delete browse category image files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'browse-category-images' and public.is_admin());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'browse_category_images'
    )
  then
    alter publication supabase_realtime add table public.browse_category_images;
  end if;
end;
$$;
