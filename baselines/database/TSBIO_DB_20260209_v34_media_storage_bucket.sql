-- TSBIO DB Snapshot / Migration
-- v34 (2026-02-09): Media foundation using Supabase Storage
-- Goal: ensure Storage bucket `media` exists (public) so Admin Media + Product Media upload works.

-- 1) Ensure bucket exists
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'media') then
    insert into storage.buckets (id, name, public)
    values ('media', 'media', true);
  end if;
end $$;

-- 2) (Best-effort) Public read policy for bucket objects
-- Note: service_role bypasses RLS; this is mainly for public URLs to be readable.
alter table if exists storage.objects enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public_read_media_bucket'
  ) then
    create policy public_read_media_bucket
      on storage.objects
      for select
      using (bucket_id = 'media');
  end if;
end $$;

-- 3) (Optional) In case bucket was created private earlier, force it public
update storage.buckets set public = true where id = 'media';

-- Done
