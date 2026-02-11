-- TSBIO Phase B1 (C3 Media) - Product media columns
-- Safe, idempotent migration.
-- Adds media jsonb + thumbnail_url + video_url.

begin;

alter table if exists public.products add column if not exists media jsonb not null default '[]'::jsonb;
alter table if exists public.products add column if not exists thumbnail_url text;
alter table if exists public.products add column if not exists video_url text;

commit;
