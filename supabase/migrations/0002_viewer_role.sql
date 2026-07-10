-- Adds a read-only 'viewer' role for shared/limited accounts (e.g. a
-- checkup-only login shared by non-writing team members). Run
-- 0002a_add_viewer_value.sql (the ALTER TYPE ADD VALUE) in its own
-- transaction first — Postgres won't let a newly added enum value be
-- referenced in the same transaction it was created in.
--
-- Select stays open to all authenticated roles (owner/teammate/viewer) on
-- every table, matching the existing shared-visibility design in CLAUDE.md.
-- Insert/update on companies, emails, and templates now additionally
-- require the caller's profile role to be 'owner' or 'teammate' — a viewer
-- can look but not touch. Delete was already owner-only and needs no change.

-- companies
drop policy if exists "companies_insert_authenticated" on public.companies;
create policy "companies_insert_authenticated"
  on public.companies for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','teammate'))
  );

drop policy if exists "companies_update_authenticated" on public.companies;
create policy "companies_update_authenticated"
  on public.companies for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','teammate')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','teammate')));

-- emails
drop policy if exists "emails_insert_authenticated" on public.emails;
create policy "emails_insert_authenticated"
  on public.emails for insert
  to authenticated
  with check (
    direction = 'outbound'
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','teammate'))
  );

drop policy if exists "emails_update_authenticated" on public.emails;
create policy "emails_update_authenticated"
  on public.emails for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','teammate')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','teammate')));

-- templates
drop policy if exists "templates_insert_authenticated" on public.templates;
create policy "templates_insert_authenticated"
  on public.templates for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','teammate')));

drop policy if exists "templates_update_authenticated" on public.templates;
create policy "templates_update_authenticated"
  on public.templates for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','teammate')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','teammate')));
