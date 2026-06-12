-- ============================================================
-- Car Share — Initial Schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- Needed for hashing passcodes
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
create table public.users (
  id            uuid primary key default gen_random_uuid(),
  name          text unique not null,
  role          text not null check (role in ('admin', 'regular')),
  color         text not null,        -- hex color used across the UI
  passcode_hash text not null,        -- bcrypt hash via pgcrypto, never exposed to client
  created_at    timestamptz not null default now()
);

-- Safe-to-expose view (no passcode hash) used for displaying names/colors in the UI
create view public.user_profiles as
  select id, name, role, color from public.users;

-- ------------------------------------------------------------
-- BOOKINGS
-- ------------------------------------------------------------
create table public.bookings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint end_after_start check (end_time > start_time),

  -- Hard DB-level guarantee: no two bookings may overlap in time
  constraint no_overlapping_bookings exclude using gist (
    tstzrange(start_time, end_time, '[)') with &&
  )
);

create index bookings_start_time_idx on public.bookings (start_time);
create index bookings_user_id_idx on public.bookings (user_id);

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
-- All writes (insert/update/delete) happen via Next.js Server Actions using
-- the SERVICE ROLE key, which bypasses RLS entirely. RLS here only governs
-- what the browser (anon key) is allowed to read directly.

alter table public.users enable row level security;
alter table public.bookings enable row level security;

-- users table: fully locked down for anon/authenticated.
-- (no select/insert/update/delete policies => no client access at all)

-- user_profiles view: safe to read (no passcode), used to show names/colors
grant select on public.user_profiles to anon, authenticated;

-- bookings: anyone can read all bookings (needed to render the shared calendar)
create policy "Bookings are viewable by everyone"
  on public.bookings for select
  using (true);

grant select on public.bookings to anon, authenticated;

-- ------------------------------------------------------------
-- SEED THE 4 USERS
-- Replace the passcodes ('1234', etc.) with whatever 4-digit PINs you want.
-- ------------------------------------------------------------
insert into public.users (name, role, color, passcode_hash) values
  ('Anat',   'admin',   '#EF4444', crypt('1234', gen_salt('bf'))), -- red
  ('Maya',   'regular', '#3B82F6', crypt('2345', gen_salt('bf'))), -- blue
  ('Yoav',   'regular', '#10B981', crypt('3456', gen_salt('bf'))), -- green
  ('Yarden', 'regular', '#F59E0B', crypt('4567', gen_salt('bf'))); -- amber
