# Rabet CRM — Project Context

## Current status (fully live)

Everything below is built, deployed, and verified — this isn't a plan, it's what exists right now.

- **App:** https://omarisbatata.github.io/rabet-crm-v2/ (GitHub Pages, repo `omarisbatata/rabet-crm-v2`)
- **Supabase project:** `jpzplchcwtpihxfqdrlo` ("rabet-crm-v2", Frankfurt/eu-central-1)
- **Schema + RLS:** applied (`supabase/migrations/0001_init.sql`, `0002a_add_viewer_value.sql`,
  `0002_viewer_role.sql`, `0003a_add_accountant_value.sql`, `0003_finance.sql`,
  `0004_add_income_type.sql`). Access-test matrix passing 66/66 (`supabase/tests/access-matrix.mjs`,
  unaffected by 0004 since it only widens the `entry_type` check constraint, no RLS change).
- **Gmail:** inbound sync live on a 15-min GitHub Actions cron, outbound send-email Edge Function
  deployed — both verified working end-to-end (12 real emails synced on first run).
- **Team roster (live accounts):**
  - Omar — owner — `oshalak@hotmail.com`
  - Luqman — teammate — `luqman.elmaddah@gmail.com`
  - Usef — teammate — `usef.sadat@hotmail.com`
  - Obada Samman — teammate — `obada.samman@hotmail.com`
  - Shared **viewer** (checkup-only, no add/edit/delete, enforced by RLS not just UI) — used by
    Taim Kiwan and Taim Al Saadi together — `admin@rabet-crm.local`
  - Zein — **accountant** (full CRUD on `finance_entries` only) — `Zeinn0there@rabetagency.com`
  - All teammate/owner passwords were set directly via the admin API (no invite emails needed
    after the first one); credentials were emailed to each person via the CRM's own send-email
    function.
- **Secrets:** local machine only, in `.env.local` (gitignored, never committed) — Supabase access
  token, DB password, project ref, anon key, service_role key, Gmail app password. Also set as a
  **GitHub Actions secret** (`SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_APP_PASSWORD` on the repo) and a
  **Supabase Edge Function secret** (`GMAIL_APP_PASSWORD`).
- **Old project status:** the old Supabase project `uirdvnhafmuqtcsobyhr` was **paused** (not
  deleted) to free a free-tier project slot for this rebuild — explicitly requested by Omar,
  reversible any time from the Supabase dashboard. The old `rabet-crm-web` repo is untouched.
- **Known deviation from the original stack line below:** actually hosted on GitHub Pages, not
  Vercel — Cloudflare/Vercel were never wired up. Update this if that changes.

---

Full rebuild of `rabet-crm-web` (old repo + old Supabase project `uirdvnhafmuqtcsobyhr` are both
left untouched, archived separately — not touched by this project). The old build had RLS enabled
with zero policies, gated entirely through hand-rolled `crm_*` security-definer functions and a
custom name+key-hash login. That worked but was fragile (manual lockout tracking, stable/volatile
RPC bugs, silent empty-result RLS denials that looked like app bugs). This rebuild uses Supabase's
native Auth + standard RLS policies instead, decided explicitly for this project (see Auth model
below) — not a default, a considered replacement.

**Scope decision:** this CRM is the **primary data store** for CRM data. Not a layer over Notion.

**Team:** Omar (owner), Luqman and Usef and Obada Samman (teammate — full read/write), plus a
shared **viewer** account (`admin@rabet-crm.local`) used by Taim Kiwan and Taim Al Saadi for
checkup-only access — no add/edit, select only. No public signup; Omar invites teammates via the
Supabase dashboard (Auth → Users → Invite); the shared viewer account was created directly with a
password set (no invite email, since it's shared rather than tied to one person's inbox).

**Stack:** Supabase (new project — not reusing the old one) + GitHub (repo, Actions, Pages). The
original plan carried over Vercel + Cloudflare from the old stack, but the app ended up hosted on
GitHub Pages instead — Vercel and Cloudflare were never actually used in this rebuild.

---

## Auth model

Real Supabase Auth (email + password), not the old custom `users` table + `crm_verify()` scheme.

- `auth.users` (Supabase-managed) is the identity table. Team members log in with email/password
  via `supabase-js`'s built-in auth, which issues a JWT. Every RLS policy below reads
  `auth.uid()` / `auth.role()` from that JWT — no custom verification function needed.
- A `public.profiles` table (1:1 with `auth.users`) carries app-specific fields: display name and
  `role` (`'owner' | 'teammate' | 'viewer' | 'accountant'`). A trigger creates the profile row
  automatically when a new `auth.users` row is inserted (i.e., when Omar invites someone).
- `viewer` is a read-only role added for shared/checkup-only accounts: select is allowed
  everywhere authenticated is, but insert/update on `companies`, `emails`, and `templates`
  additionally require the caller's profile role to be `owner` or `teammate` (see migration
  `0002_viewer_role.sql`). Delete was already owner-only and needed no change. The app also hides
  Add/Edit/Delete/Compose UI for viewers, but RLS is the actual enforcement, not the UI.
- `accountant` is a role scoped entirely to `finance_entries` (company spending/salary tracking,
  see migrations `0003a_add_accountant_value.sql` and `0003_finance.sql`): full CRUD there, same as
  `owner`, but zero access to `companies`/`emails`/`templates`/`profiles` beyond the baseline
  `profiles_select_authenticated` policy every authenticated role gets. `teammate` and `viewer` get
  no access to `finance_entries` at all (no policy for either role — deny by default).
- Finance is the one part of the app that isn't a modal overlay in `index.html`/`app.js` — it's a
  standalone page (`finance.html` + `finance.js`) that opens in a new tab from the sidebar nav
  (`window.open('finance.html', '_blank')`), sharing the same Supabase session via localStorage.
  The nav link itself is hidden for anyone but owner/accountant, and `finance.js`'s `init()`
  independently re-checks the session + role on load and redirects to `index.html` if either check
  fails — since this page has a real, guessable URL (unlike the rest of the app), that redirect is
  the actual enforcement layer for "don't let a teammate/viewer in by typing the URL," not just RLS
  and not just hiding the nav link.
- `finance_entries.entry_type` is `'expense' | 'salary' | 'income'` (migration
  `0004_add_income_type.sql` widened the check constraint to add `income`). The **payee** field
  changes input mode per type, all in `finance.js`'s `payeeFieldHtml()` — this is deliberate, not
  three unrelated hacks:
  - `salary` → fixed dropdown of team member names, pulled live from `profiles` (excludes the
    shared `viewer` account). No free typing.
  - `income` → fixed dropdown: Monthly Sub / Deals / Photoshoots (`INCOME_OPTIONS` in `finance.js`).
    No free typing.
  - `expense` → free-text input backed by an HTML `<datalist>` of distinct payee values already
    used on other expense rows, so it behaves like a combo box: pick an existing one or type a new
    one, and the new one becomes a preset on its own next time (no separate presets table — it's
    just derived from `finance_entries` history).
  If you edit an older row whose stored payee no longer matches the current preset list (e.g. an
  ex-employee), that value is still injected as an extra option so editing never silently
  overwrites it.
- **Role changes are manual SQL only** — never exposed through the app or any RLS `update` policy.
  This includes granting the `accountant` role to a new profile: invite via the Supabase dashboard
  as usual, then `update profiles set role = 'accountant' where id = '...'` in the SQL editor, same
  manual process already used for owner/teammate/viewer. With this few people, automating role
  assignment isn't worth it and it closes off any self-escalation path.
- `anon` (logged-out) gets zero access anywhere. RLS is enabled with no anon-targeting policy on
  every table, and table-level grants to `anon` are explicitly revoked as defense in depth.

---

## Schema + RLS (per table, not bolted on after)

The block below is the original launch schema (`0001_init.sql`). It has since been extended by
`supabase/migrations/0002a_add_viewer_value.sql` and `0002_viewer_role.sql` (adds the `viewer`
role and tightens `companies`/`emails`/`templates` insert+update policies — see Auth model above),
and by `0003a_add_accountant_value.sql` and `0003_finance.sql` (adds the `accountant` role and the
`finance_entries` table — full CRUD for owner/accountant, no access for teammate/viewer).
The `supabase/migrations/` directory is the authoritative current state; this block is kept for
the original per-table rationale, not as a byte-for-byte mirror of the live schema.

```sql
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
-- anon/authenticated policies above. See "Gmail integration" section.


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
```

---

## Access test matrix (run before any UI is built)

Every cell below must be verified against the live project — as `owner`, `teammate`, `viewer`,
`accountant`, and `anon` — using separate Supabase clients (JWT per role, bare anon key). Expected
results:

| Table           | anon (select/insert/update/delete) | teammate (select/insert/update/delete) | viewer (select/insert/update/delete) | owner (select/insert/update/delete) | accountant (select/insert/update/delete) |
|-----------------|-------------------------------------|------------------------------------------|----------------------------------------|----------------------------------------|--------------------------------------------|
| profiles        | deny / deny / deny / deny           | allow / deny¹ / own-row-only² / deny     | allow / deny¹ / own-row-only² / deny   | allow / deny¹ / own-row-only² / deny   | allow / deny¹ / own-row-only² / deny       |
| companies       | deny / deny / deny / deny           | allow / allow / allow / **deny**         | allow / **deny** / **deny** / deny     | allow / allow / allow / allow          | allow / **deny** / **deny** / deny         |
| emails          | deny / deny / deny / deny           | allow / allow (outbound only) / allow / **deny** | allow / **deny** / **deny** / deny | allow / allow / allow / allow  | allow / **deny** / **deny** / deny |
| templates       | deny / deny / deny / deny           | allow / allow / allow / **deny**         | allow / **deny** / **deny** / deny     | allow / allow / allow / allow          | allow / **deny** / **deny** / deny         |
| finance_entries | deny / deny / deny / deny           | **deny** / **deny** / **deny** / **deny** | **deny** / **deny** / **deny** / **deny** | allow / allow / allow / allow       | allow / allow / allow / allow              |

¹ insert has no client-facing policy at all (trigger-only path) — all roles should get denied.
² a teammate/owner/viewer/accountant can update their own `full_name` but an attempt to change
their own `role` column must be rejected by the `with check` clause — test this explicitly, not
just "update succeeds/fails" as a whole.

`finance_entries` denies teammate/viewer entirely by design (no policy for either role) — this is
the one table where `companies`/`emails`/`templates`-style baseline select access does not apply.

Implemented and passing (46/46) in `supabase/tests/access-matrix.mjs` — mints real sessions via
admin `generate_link` (magiclink) + verify, no passwords touched, so it never interferes with a
pending invite/recovery link.

Write this as an actual test script (Node or Deno, using `@supabase/supabase-js` three times with
three different auth contexts) before any UI code — per the build order below.

---

## Gmail integration

Kept the old design as-is — a single shared mailbox (`shalakomar9@gmail.com`), authenticated with
a **Gmail App Password**, not OAuth. There is no Google Cloud OAuth client involved anywhere in
this project; a service-account JSON found in the old Downloads folder is unrelated to Gmail and
is not used.

- **Inbound:** GitHub Actions cron job polls IMAP (`imapflow` + `mailparser`), writes new mail
  into `public.emails` using the Supabase **service_role** key (bypasses RLS, dedupes on
  `gmail_message_id`). Ported from the old repo's `sync/sync-emails.mjs` once schema is live.
- **Outbound:** Supabase Edge Function (`supabase/functions/send-email`), hand-rolled SMTP client,
  same app password. Already fully written in the old repo — just needs a **fresh**
  `GMAIL_APP_PASSWORD` secret set on the new Supabase project (generate a new Google App Password;
  don't reuse the old one across two live projects).
- Neither path touches the `crm_*` functions or key-hash scheme — inbound is service_role
  (pre-authenticated, trusted), outbound is an authenticated Supabase user calling the Edge
  Function, which independently checks the caller's session before sending.

---

## Build order

1. New Supabase project (Frankfurt, matching the old one's region for latency).
2. Run the schema above in the SQL Editor — auth, profiles trigger, all 4 tables, all RLS
   policies, in one pass (not schema-then-RLS-later).
3. Create auth users (dashboard invite, or admin API for direct-password/no-email accounts like
   the shared viewer login); set each `profiles.role` manually as needed.
4. Write and run the access test matrix above against the live project. Nothing proceeds until
   every cell matches.
5. Port inbound Gmail sync (GitHub Actions workflow + `sync-emails.mjs`), point at the new
   project's service_role key.
6. Deploy the outbound `send-email` Edge Function, add the new `GMAIL_APP_PASSWORD` secret.
7. UI last — companies list/pipeline view, company detail + correspondence tab, templates,
   auth screens.
