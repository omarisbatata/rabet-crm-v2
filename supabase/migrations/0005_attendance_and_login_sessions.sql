-- ═══════════════════════════════════════════════════════════════════
-- attendance_entries — manual sign-in/sign-out logs entered by the owner
-- only. Nobody else (including the person the entry is about) can see
-- this table — deny by default for every role but owner.
-- ═══════════════════════════════════════════════════════════════════
create table public.attendance_entries (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id),   -- who was present
  sign_in_at   timestamptz not null,
  sign_out_at  timestamptz,                                     -- null while session is open
  entered_by   uuid references public.profiles(id) default auth.uid(),
  created_at   timestamptz not null default now()
);

create index attendance_entries_profile_idx  on public.attendance_entries (profile_id);
create index attendance_entries_sign_in_idx  on public.attendance_entries (sign_in_at);

alter table public.attendance_entries enable row level security;

create policy "attendance_entries_owner_all"
  on public.attendance_entries for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

-- No policy for teammate/viewer/accountant — RLS enabled with no matching
-- policy denies every operation for them by default.

revoke all on public.attendance_entries from anon;


-- ═══════════════════════════════════════════════════════════════════
-- login_sessions — auto-tracked CRM usage sessions, one row per
-- login/heartbeat streak. The client inserts a row on login and updates
-- last_heartbeat_at every few minutes while the tab is open; a gap in
-- heartbeats (tab closed, laptop slept) means the next activity starts a
-- new row instead of resuming this one. Session duration is derived as
-- last_heartbeat_at - login_at, computed by whoever reads the table
-- (the owner dashboard), not stored.
-- ═══════════════════════════════════════════════════════════════════
create table public.login_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id),
  login_at           timestamptz not null default now(),
  last_heartbeat_at  timestamptz not null default now()
);

create index login_sessions_user_idx     on public.login_sessions (user_id);
create index login_sessions_login_at_idx on public.login_sessions (login_at);

alter table public.login_sessions enable row level security;

-- Every user can see and create their own session rows (needed so the
-- client can find its own most recent row to decide whether to resume the
-- heartbeat or start a new session).
create policy "login_sessions_select_own"
  on public.login_sessions for select
  to authenticated
  using (user_id = auth.uid());

create policy "login_sessions_insert_own"
  on public.login_sessions for insert
  to authenticated
  with check (user_id = auth.uid());

-- Heartbeat updates — a user may only touch their own rows.
create policy "login_sessions_update_own"
  on public.login_sessions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Only the owner can see everyone else's sessions (for the hours panel).
create policy "login_sessions_select_owner_all"
  on public.login_sessions for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

-- No delete policy for anyone, no update policy beyond "own row" — deny by
-- default for everything else, including teammate/viewer/accountant trying
-- to update or delete another person's session.

revoke all on public.login_sessions from anon;
