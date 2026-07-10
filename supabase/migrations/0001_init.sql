-- ═══════════════════════════════════════════════════════════════════
-- profiles — extends auth.users with app-specific fields
-- ═══════════════════════════════════════════════════════════════════
create type public.team_role as enum ('owner', 'teammate');

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       public.team_role not null default 'teammate',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any logged-in team member can see the team directory (assignee dropdowns, etc).
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- A user may update only their own row, and may never change their own role
-- (role stays fixed at whatever it was; change it via SQL editor only).
create policy "profiles_update_own_non_role"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- No insert/delete policy for any client role — the trigger below (running as
-- the table owner, which bypasses RLS) is the only path in; delete is manual.

revoke all on public.profiles from anon;

-- Auto-create a profile row when Omar invites a new team member.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ═══════════════════════════════════════════════════════════════════
-- companies — core CRM entity: one row per prospect/client
-- ═══════════════════════════════════════════════════════════════════
create type public.pipeline_stage as enum
  ('not_contacted', 'contacted', 'meeting_set', 'closed_won', 'dead');

create table public.companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  industry      text default '',
  contact_type  text default '',   -- e.g. 'whatsapp', 'email', 'instagram'
  contact_value text default '',
  service       text default '',   -- which of the 6 services this prospect is for
  stage         public.pipeline_stage not null default 'not_contacted',
  assigned_to   uuid references public.profiles(id),
  followup_at   timestamptz,
  notes         text default '',
  created_by    uuid not null references public.profiles(id) default auth.uid(),
  modified_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index companies_stage_idx     on public.companies (stage);
create index companies_assigned_idx  on public.companies (assigned_to);
create index companies_followup_idx  on public.companies (followup_at);

alter table public.companies enable row level security;

-- Whole team sees the whole pipeline — this is a 3-person shared CRM, not
-- multi-tenant, so there's no per-user siloing of company rows.
create policy "companies_select_authenticated"
  on public.companies for select
  to authenticated
  using (true);

create policy "companies_insert_authenticated"
  on public.companies for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "companies_update_authenticated"
  on public.companies for update
  to authenticated
  using (true)
  with check (true);

-- Delete is destructive and irreversible for shared data — owner only.
create policy "companies_delete_owner"
  on public.companies for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

revoke all on public.companies from anon;

-- keep updated_at honest and modified_by accurate on every write
create function public.touch_company()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.modified_by := auth.uid();
  return new;
end;
$$;

create trigger companies_touch
  before update on public.companies
  for each row execute function public.touch_company();


-- ═══════════════════════════════════════════════════════════════════
-- emails — Gmail correspondence (inbound sync + outbound send), optionally
-- linked to a company
-- ═══════════════════════════════════════════════════════════════════
create table public.emails (
  id               uuid primary key default gen_random_uuid(),
  gmail_message_id text unique not null,
  thread_id        text,
  direction        text not null check (direction in ('inbound', 'outbound')),
  from_address     text not null default '',
  to_addresses     text not null default '',
  subject          text default '',
  body_text        text default '',
  body_html        text default '',
  received_at      timestamptz not null default now(),
  company_id       uuid references public.companies(id) on delete set null,
  linked_at        timestamptz,
  created_at       timestamptz not null default now()
);

create index emails_company_id_idx  on public.emails (company_id);
create index emails_thread_id_idx   on public.emails (thread_id);
create index emails_received_at_idx on public.emails (received_at desc);

alter table public.emails enable row level security;

-- Shared inbox visibility — any team member can read/link/reply to any mail.
create policy "emails_select_authenticated"
  on public.emails for select
  to authenticated
  using (true);

-- Outbound compose from the UI goes through this policy directly for the DB
-- row; the actual send happens in the send-email Edge Function (below),
-- which uses service_role and so bypasses RLS entirely for its own insert.
create policy "emails_insert_authenticated"
  on public.emails for insert
  to authenticated
  with check (direction = 'outbound');

-- Link/unlink a thread to a company.
create policy "emails_update_authenticated"
  on public.emails for update
  to authenticated
  using (true)
  with check (true);

create policy "emails_delete_owner"
  on public.emails for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

revoke all on public.emails from anon;

-- NOTE: the inbound sync job (GitHub Actions cron, IMAP) authenticates with
-- the service_role key, which bypasses RLS by design — it does a plain
-- `insert ... on conflict (gmail_message_id) do nothing`. It never uses the
-- anon/authenticated policies above. See "Gmail integration" section in
-- CLAUDE.md.


-- ═══════════════════════════════════════════════════════════════════
-- templates — reusable email templates
-- ═══════════════════════════════════════════════════════════════════
create table public.templates (
  id         uuid primary key default gen_random_uuid(),
  category   text not null,
  name       text not null,
  subject    text default '',
  body       text default '',
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.templates enable row level security;

create policy "templates_select_authenticated"
  on public.templates for select
  to authenticated
  using (true);

create policy "templates_insert_authenticated"
  on public.templates for insert
  to authenticated
  with check (true);

create policy "templates_update_authenticated"
  on public.templates for update
  to authenticated
  using (true)
  with check (true);

create policy "templates_delete_owner"
  on public.templates for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

revoke all on public.templates from anon;
