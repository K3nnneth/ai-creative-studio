insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'source-assets',
    'source-assets',
    true,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'ad-creatives',
    'ad-creatives',
    true,
    26214400,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table storage.buckets is 'Storage buckets managed by Supabase Storage.';
