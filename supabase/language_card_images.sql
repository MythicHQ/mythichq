create table if not exists public.language_card_images (
  language_slug text primary key,
  image_url text not null,
  storage_path text not null unique,
  updated_at timestamptz not null default now()
);

alter table public.language_card_images enable row level security;

drop policy if exists "Anyone can view language card images" on public.language_card_images;
create policy "Anyone can view language card images"
  on public.language_card_images for select to anon, authenticated using (true);

drop policy if exists "Admins can add language card images" on public.language_card_images;
create policy "Admins can add language card images"
  on public.language_card_images for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins can update language card images" on public.language_card_images;
create policy "Admins can update language card images"
  on public.language_card_images for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete language card images" on public.language_card_images;
create policy "Admins can delete language card images"
  on public.language_card_images for delete to authenticated using (public.is_admin());

grant select on public.language_card_images to anon, authenticated;
grant insert, update, delete on public.language_card_images to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('language-card-images', 'language-card-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view language card image files" on storage.objects;
create policy "Anyone can view language card image files"
  on storage.objects for select to anon, authenticated using (bucket_id = 'language-card-images');

drop policy if exists "Admins can upload language card image files" on storage.objects;
create policy "Admins can upload language card image files"
  on storage.objects for insert to authenticated with check (bucket_id = 'language-card-images' and public.is_admin());

drop policy if exists "Admins can update language card image files" on storage.objects;
create policy "Admins can update language card image files"
  on storage.objects for update to authenticated using (bucket_id = 'language-card-images' and public.is_admin()) with check (bucket_id = 'language-card-images' and public.is_admin());

drop policy if exists "Admins can delete language card image files" on storage.objects;
create policy "Admins can delete language card image files"
  on storage.objects for delete to authenticated using (bucket_id = 'language-card-images' and public.is_admin());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'language_card_images')
  then alter publication supabase_realtime add table public.language_card_images;
  end if;
end;
$$;
