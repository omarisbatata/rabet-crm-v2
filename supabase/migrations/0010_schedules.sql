-- ═══════════════════════════════════════════════════════════════════
-- schedules — weekly shift roster. One row per (week, user, day). Read
-- access is open to the whole team (everyone needs to see who's working
-- when); write access is owner-only, same shape as companies_delete_owner
-- elsewhere in this schema, just widened to cover insert/update/delete
-- too since there's no "teammate can propose, owner approves" step here.
--
-- Default work week is Sat–Thu (day_of_week 0..5), Friday (6) off — that's
-- a UI/app-logic default (see schedule_nav in app.js), not enforced here;
-- the owner can still set any day to any shift.
--
-- "Repeat" isn't a separate table — is_repeating lives on each row of a
-- week's rows (all rows for a given week_start_date always share the same
-- value, set together on save). A week with no explicit rows inherits the
-- pattern from the closest earlier week that has rows, but only if that
-- week's rows have is_repeating = true; the moment the owner saves an
-- explicit row set for any later week (repeating or not), that becomes
-- the new closest week and the chain re-starts from there. All of that
-- resolution happens client-side in app.js (resolveScheduleWeek) — the
-- table itself just stores explicit per-week rows.
-- ═══════════════════════════════════════════════════════════════════
create table public.schedules (
  id              uuid primary key default gen_random_uuid(),
  week_start_date date not null,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  day_of_week     int not null check (day_of_week between 0 and 6), -- 0=Sat..6=Fri
  shift           text not null check (shift in ('morning', 'afternoon', 'off')),
  start_time      time,
  end_time        time,
  is_repeating    boolean not null default false,
  created_by      uuid references public.profiles(id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (week_start_date, user_id, day_of_week),
  check (
    (shift = 'off' and start_time is null and end_time is null)
    or
    (shift <> 'off' and start_time is not null and end_time is not null)
  )
);

create index schedules_week_idx    on public.schedules (week_start_date);
create index schedules_user_idx    on public.schedules (user_id);

alter table public.schedules enable row level security;

-- Whole team reads the whole roster — same "shared team, no siloing"
-- reasoning as companies_select_authenticated.
create policy "schedules_select_authenticated"
  on public.schedules for select
  to authenticated
  using (true);

-- No approval/request step — the owner role check is the entire
-- authorization, matching the brief (owner edits and saves directly).
create policy "schedules_insert_owner"
  on public.schedules for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

create policy "schedules_update_owner"
  on public.schedules for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

create policy "schedules_delete_owner"
  on public.schedules for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

revoke all on public.schedules from anon;

create function public.touch_schedule()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger schedules_touch
  before update on public.schedules
  for each row execute function public.touch_schedule();
