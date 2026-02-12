-- TSBIO Phase B1 (V27) - Product flags + flashsale fields (safe add)
-- Apply this AFTER TSBIO_DB_20260207_v21_phaseB.sql (taxonomy/stock fields).
-- Goal: support constitution-required flags and flashsale metadata.

do $$
begin
  alter table public.products add column if not exists is_combo boolean not null default false;
  alter table public.products add column if not exists is_featured boolean not null default false;
  alter table public.products add column if not exists is_flashsale boolean not null default false;
  alter table public.products add column if not exists flashsale_percent numeric null;
  alter table public.products add column if not exists flashsale_end_at timestamptz null;
  alter table public.products add column if not exists is_verified boolean not null default false;
  alter table public.products add column if not exists is_archived boolean not null default false;
exception
  when undefined_table then
    raise notice 'public.products does not exist yet';
end $$;

-- Optional indexes for common filters (safe)
do $$
begin
  create index if not exists idx_products_flags_active on public.products(active, is_combo, is_featured, is_flashsale) where deleted_at is null;
exception
  when undefined_table then
    raise notice 'public.products missing; skip index';
end $$;
