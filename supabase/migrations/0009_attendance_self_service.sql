-- Attendance was originally owner-only, no exceptions — "nobody else,
-- including the person the entry is about, can see it" (see
-- 0005_attendance_and_login_sessions.sql). That made manual entry the only
-- path in, which in practice meant nobody used it. This walks that back on
-- purpose: each employee can now self-clock a shift (their own sign-in,
-- and closing their own still-open sign-out), while owner keeps full
-- CRUD/visibility over everyone's via the existing
-- attendance_entries_owner_all policy (these are additive — Postgres ORs
-- permissive policies together for the same command).
--
-- Still not exposed to anyone but the row's own owner and the app owner:
-- an employee can only ever see/insert/close their *own* rows, never
-- anyone else's, and can never edit a shift once it's closed (that's
-- owner-only, via attendance_entries_owner_all) — only correct a mistake
-- by asking the owner, same as everywhere else in this schema that keeps
-- history append-only-ish for non-owners.

create policy "attendance_entries_select_own"
  on public.attendance_entries for select
  to authenticated
  using (profile_id = auth.uid());

create policy "attendance_entries_insert_own"
  on public.attendance_entries for insert
  to authenticated
  with check (profile_id = auth.uid());

-- Can only update their own row while it's still open (sign_out_at is
-- null) — once sign_out_at is set, this policy's `using` no longer
-- matches, so the employee can't reopen or rewrite a closed shift.
create policy "attendance_entries_update_own_open"
  on public.attendance_entries for update
  to authenticated
  using (profile_id = auth.uid() and sign_out_at is null)
  with check (profile_id = auth.uid());
