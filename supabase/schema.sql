-- Workouts & Meals: database setup
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.
-- Safe to re-run.

-- Program, saved meals, supplements and profile/targets (a single row, id = 'main').
create table if not exists public.app_settings (
  id         text primary key default 'main',
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- One row per day. The JSON columns hold the detail; the number columns are
-- daily totals the app fills in, so the table is easy to read in Supabase.
create table if not exists public.daily_logs (
  day          date primary key,
  workout      jsonb,                                  -- exercises, sets (weight/reps/done), run
  food         jsonb   not null default '[]'::jsonb,   -- logged meals with macros and servings
  water        jsonb   not null default '[]'::jsonb,   -- each pour in oz
  supplements  jsonb   not null default '{}'::jsonb,   -- which toggles were checked
  weight_lbs   numeric,
  sleep_hours  numeric,
  steps        integer,
  water_oz     integer not null default 0,
  calories     integer not null default 0,
  protein_g    integer not null default 0,
  carbs_g      integer not null default 0,
  fat_g        integer not null default 0,
  workout_done boolean not null default false,
  updated_at   timestamptz not null default now()
);

-- Added later (sleep + steps). Harmless if the columns already exist.
alter table public.daily_logs
  add column if not exists sleep_hours numeric,
  add column if not exists steps       integer;

-- No sign-in: the site's public key can read and write both tables.
alter table public.app_settings enable row level security;
alter table public.daily_logs   enable row level security;

drop policy if exists "dashboard access" on public.app_settings;
create policy "dashboard access" on public.app_settings
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "dashboard access" on public.daily_logs;
create policy "dashboard access" on public.daily_logs
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.app_settings, public.daily_logs to anon, authenticated;

-- Live updates: a change on one device shows up on the others right away.
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_logs') then
    alter publication supabase_realtime add table public.daily_logs;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_settings') then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;
