# Rabet CRM — Project Context

## Current status (fully live)

Everything below is built, deployed, and verified — this isn't a plan, it's what exists right now.

- **App:** https://omarisbatata.github.io/rabet-crm-v2/ (GitHub Pages, repo `omarisbatata/rabet-crm-v2`)
- **Supabase project:** `jpzplchcwtpihxfqdrlo` ("rabet-crm-v2", Frankfurt/eu-central-1)
- **Schema + RLS:** applied (`supabase/migrations/0001_init.sql`, `0002a_add_viewer_value.sql`,
  `0002_viewer_role.sql`, `0003a_add_accountant_value.sql`, `0003_finance.sql`,
  `0004_add_income_type.sql`, `0005_attendance_and_login_sessions.sql`,
  `0006_finance_company_link.sql`, `0007a_add_it_value.sql`, `0007_it_module.sql`,
  `0008_next_action_note.sql`, `0009_attendance_self_service.sql`,
  `0010_schedules.sql`). Access-test matrix passing 80/80 (`supabase/tests/access-matrix.mjs`) —
  `schedules` coverage was added alongside its migration; `attendance_entries`/`login_sessions`
  are still the outstanding gap (see "Known gap" below), unchanged by this round.
- **Schedule module** (`0010_schedules.sql`) — weekly shift roster, one row per
  (`week_start_date`, `user_id`, `day_of_week`), `day_of_week` 0=Sat..6=Fri to match the default
  Sat–Thu work week (Friday off). `shift` is `morning` (7:00–12:00) / `afternoon` (12:00–17:00) /
  `off`, enforced by a check constraint that `off` carries null start/end times and the other two
  don't. RLS: any authenticated role can `select` the whole roster; `insert`/`update`/`delete` are
  owner-only, straight role check, no approval/request step (mirrors `companies_delete_owner`'s
  shape, just widened to every write). Lives as a modal overlay in `index.html`/`app.js` (like
  Templates/Inbox), not a standalone gated page like Finance/IT/Dashboard, since it's meant to be
  visible to every role — the "Schedule" nav button has no role-based `hidden` toggle; only the
  in-modal Edit button and the dropdown grid are gated to `isOwner()`.
  - **"Repeat" isn't a separate table or column resolved in SQL** — `is_repeating` lives on every
    row of a saved week (all rows for one `week_start_date` always share the same value, set
    together on save). A week with no explicit rows of its own inherits the pattern from the
    *closest earlier week that has rows*, but only if that week's rows were saved with
    `is_repeating = true`. All of that resolution happens client-side in `app.js`
    (`resolveScheduleWeek`) by fetching the whole `schedules` table once per modal-open (small
    team, small history — no pagination needed yet) and walking it in memory; the table itself
    just stores explicit per-week rows. Saving a week always deletes-then-reinserts a full
    7-day × all-profiles grid (including explicit `off` rows) — that full row set is what makes a
    week "explicit" and able to override/restart a repeat chain, even if every cell in it is off.
  - Owner's edit grid is days (rows) × every profile (columns), each cell a shift `<select>`,
    prefilled from whatever `resolveScheduleWeek` resolves for that week (explicit or inherited) so
    editing an inherited week starts from its actual current pattern, not a blank slate. The
    read-only view (both what non-owners see, and what the owner sees before hitting Edit) is
    inverted — days (rows) × Morning/Afternoon/Off (columns), team member names in the cells.
- **Attendance + login-session tracking, and a per-client finance breakdown:**
  - `attendance_entries` — started owner-only-entry (see Dashboard's Attendance tab), then gained
    self-service on top (`0009_attendance_self_service.sql` — see its own bullet below): everyone
    can clock their own shifts via the sidebar's Sign In/Sign Out button, but still can't see
    anyone else's, and owner keeps full CRUD/visibility over all of it.
  - `login_sessions` — auto-tracked CRM usage. `app.js` inserts a row on first login (or resumes the
    existing one if the last heartbeat was under 15 min ago) and updates `last_heartbeat_at` every
    ~4 min while the tab is open (`ensureLoginSession`/`sendHeartbeat`/`startHeartbeatLoop`). A user
    can only see/insert/update their own rows; only `owner` can select all of them.
  - `finance_entries.company_id` — nullable FK to `companies`, added so the Dashboard's finance panel
    can break totals down by real CRM client (mainly used on `income` rows).
  - **Dashboard page** (`dashboard.html` + `dashboard.js`) — new standalone owner-only page, same
    gating pattern as `finance.html` (redirect to `index.html` if no session or `role !== 'owner'`,
    since this page has a real URL). Two tabs: Overview (finance totals + by-client breakdown, and a
    side-by-side hours panel — manual attendance hours vs. CRM login hours, both per person) and
    Attendance (the manual sign-in/sign-out CRUD for `attendance_entries`).
  - **Known gap:** `supabase/tests/access-matrix.mjs` has not been extended to cover
    `attendance_entries` or `login_sessions` yet — do this before treating those RLS policies as
    verified, same as every other table in this project.
  - **Reversed the "owner-only, no exceptions" design** (`0009_attendance_self_service.sql`): the
    original owner-only-entry design meant nobody actually used it, so there's now a self-service
    Sign In/Sign Out button in the main app's sidebar (`#btn-shift` / `loadMyShift`/
    `renderShiftButton` in `app.js`), visible to every role. Each person can insert their own
    sign-in and close their own still-open sign-out (`attendance_entries_select_own`/`insert_own`/
    `update_own_open`), but still can't see anyone else's attendance or edit a shift once it's
    closed — those stay owner-only via the original `attendance_entries_owner_all` policy (all
    additive; Postgres ORs permissive policies together). Omar's explicit call, made when the
    Dashboard's Hours panel was reported as "always showing 00" — the real cause was that the
    manual-entry-only design meant `attendance_entries` was nearly empty, not a rendering bug.
  - **Also fixed while investigating that report:** `dashboard.js`'s `monthRange()` built its
    default "current month" range by constructing a local-midnight `Date` and calling
    `toISOString()`, which silently shifts both ends back a day in any UTC+ timezone (Damascus
    included) — e.g. "July" became `06-30` to `07-30`. Fixed to build the `YYYY-MM-DD` strings
    from local date parts directly, no UTC conversion involved.
- **IT module** — new `it` role (added the same two-step way as `viewer`/`accountant`: an
  `ALTER TYPE ADD VALUE` migration committed alone before anything references it), scoped like
  Finance/`accountant` — full access for `it`/`owner`, narrow self-service for everyone else:
  - `it_assets` — infra/subscriptions, `it`/`owner` only, no employee access at all.
  - `it_equipment` — `it`/`owner` full CRUD; an employee can `select` only rows where
    `assigned_to = auth.uid()` (their own gear, read-only).
  - `it_tickets` — `it`/`owner` see/manage everything; an employee can insert and can
    select/update only rows where `created_by = auth.uid()`. `assigned_to` defaults to "the IT
    person" via a `before insert` trigger (`default_it_ticket_assignee`) — Postgres doesn't allow a
    subquery in a column `DEFAULT`, which is why this isn't just a `default (select ...)` like the
    company/profile FKs elsewhere in this schema.
  - `it_ticket_comments` — access inherits from the parent ticket (via an `exists` check against
    `it_tickets`); append-only, no update/delete policy for anyone.
  - `it_messages` — 1:1 chat, not group. `it`/`owner` can select every conversation; anyone else
    only rows where they're `sender_id` or `recipient_id`. The recipient can `update` their own rows
    (used to stamp `read_at`) — RLS grants the whole row, not just that column, same accepted
    trade-off as `it_tickets_update_own` (see the migration file's comments).
  - **Pages:** `it.html`/`it.js` — admin side (Assets/Equipment/Tickets/Chat tabs), gated to
    `it`/`owner` with the same real-URL redirect pattern as `finance.html`/`dashboard.html`.
    `ithelp.html`/`ithelp.js` — "Get IT Help" self-service side (My Tickets/Message IT/My
    Equipment), open to any signed-in role, including `it`/`owner` themselves. Both poll every 12s
    while their live-updating tab (tickets/chat) is active — same "no realtime, just poll" choice
    already made for the main company list.
- **Follow-up reminders** (`0008_next_action_note.sql`) — deliberately did **not** add a separate
  `next_action_date` column: `companies.followup_at` already was exactly that (already drove the
  sidebar's upcoming/overdue counts and the table's Follow-up column), so the only new column is
  `next_action_note` (free text — what needs to happen, shown in the modal, the view overlay, as a
  tooltip on the table's Follow-up cell, and in the digest email below).
  - **Dashboard → Follow-ups tab** (`dashboard.js`): every company with `followup_at` on or before
    today, excluding `closed_won`/`dead`, split into Overdue vs. Due Today.
  - **Daily digest email** (`sync/daily-digest.mjs` + `.github/workflows/daily-digest.yml`, cron
    `0 6 * * *` UTC = 09:00 Damascus): queries the same overdue/due-today set with the service_role
    key and emails a summary straight over Gmail SMTP via `nodemailer`. Recipient is fixed to the
    owner only (`DIGEST_TO: oshalak@hotmail.com` in the workflow env), not per-assignee — Omar's
    explicit choice, since one person needs full pipeline visibility rather than everyone getting a
    filtered slice. **Not** routed through the `send-email` Edge Function — that function requires
    a real logged-in user's JWT (see its header comment), which a cron job doesn't have, so this
    sends directly instead, reusing the same `GMAIL_APP_PASSWORD` secret. No email is sent at all
    when nothing is overdue/due (checked and logged, not just an empty send).
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
  - "IT" — **it** role (full access to the IT module: `it_assets`/`it_equipment`/`it_tickets`/
    `it_ticket_comments`/`it_messages`) — `IT@rabetagency.com` (replaced the earlier
    `AB5DR@rabetagency.com` account; that auth user was deleted after reassigning its existing
    `it_tickets`/`it_messages`/`login_sessions` rows to the new profile id, so no IT-module history
    was lost). `full_name` is currently just the placeholder "IT" (no real name was given when the
    account was created) — update `profiles.full_name` if/when you want it to show a real name in
    the sidebar/tickets/chat.
  - All teammate/owner passwords were set directly via the admin API (no invite emails needed
    after the first one); credentials were emailed to each person via the CRM's own send-email
    function (the IT account's credentials were given directly to Claude by Omar in-session instead).
- **Secrets:** local machine only, in `.env.local` (gitignored, never committed) — Supabase access
  token, DB password, project ref, anon key, service_role key, Gmail app password. Also set as a
  **GitHub Actions secret** (`SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_APP_PASSWORD` on the repo) and a
  **Supabase Edge Function secret** (`GMAIL_APP_PASSWORD`).
- **Applying migrations from this machine:** direct Postgres connections (port 5432/6543, both
  direct and pooler) are unreachable from this sandbox — `supabase db push` fails with a connection
  timeout/DNS error. What does work: the Supabase **Management API** over HTTPS
  (`POST https://api.supabase.com/v1/projects/{ref}/database/query`, `Authorization: Bearer
  $SUPABASE_ACCESS_TOKEN`, body `{"query": "<sql>"}`), which runs arbitrary SQL against the live
  project and is how every migration from `0005` onward was applied. Prefer that path over
  `db push` here. It runs the whole SQL file as one transaction — a mid-file error (e.g. `0007`'s
  first attempt, which tried a subquery in a column `DEFAULT`) rolls back cleanly with nothing
  partially applied, so it's safe to just fix the file and re-run the same request.
- **Old project status:** the old Supabase project `uirdvnhafmuqtcsobyhr` was **paused** (not
  deleted) to free a free-tier project slot for this rebuild — explicitly requested by Omar,
  reversible any time from the Supabase dashboard. The old `rabet-crm-web` repo is untouched.
- **Known deviation from the original stack line below:** actually hosted on GitHub Pages, not
  Vercel — Cloudflare/Vercel were never wired up. Update this if that changes.

### Built, not yet deployed — AI assist + audit PDF generator

Unlike everything above, the pieces below are written but **not yet deployed/verified live** —
no `supabase` CLI and no `ANTHROPIC_API_KEY` were available in the sandbox that built them.

- **Mailbox hidden behind a flag:** `MAILBOX_ENABLED = false` in `config.js` hides the Inbox nav
  entry/badge in `app.js` (`bootApp`'s `refreshInboxBadge` calls are gated the same way). Backend
  (`emails` table, the 15-min inbound sync cron, the `send-email` function) is untouched — flip
  the flag back to `true` to bring the nav entry back, no other change needed.
- **`supabase/functions/ai-assist/index.ts`** — new shared Edge Function, same JWT-forwarding auth
  pattern as `send-email`, plus an explicit `profiles.role` check (owner/teammate only — everyone
  else gets a 403, on top of the frontend hiding the buttons). Body is `{ task, context }`; a
  `switch(task)` currently handles `draft_email` and `draft_audit`, calling the Anthropic Messages
  API (`model: "claude-sonnet-5"`). Adding a future task (company notes, summaries, ticket triage)
  is a new `case` + handler function, not a new Edge Function. **Deploy:**
  `supabase functions deploy ai-assist`, then `supabase secrets set ANTHROPIC_API_KEY=...`.
- **AI email draft panel** (company edit modal, `app.js`'s `showModal`) — "Draft with AI" button,
  optional template picker, calls `ai-assist` (`draft_email`) and shows the result in an editable
  subject/body pair with a Copy-to-clipboard button. Deliberately **not** wired into the existing
  Correspondence/Compose section — no send path, copy-paste only. Gated to owner/teammate via
  `canUseAI()`.
- **Audit PDF generator** (`audit.js`, triggered from the same company modal) — form mirrors the
  existing Haseeb Coffee reference audit exactly (client name, date, intro line, 6 Fix Now items,
  5 What to Add items, Bottom Line paragraph + 3 priorities, EN/AR toggle for the *document's*
  language, independent of the CRM's own UI language). "Draft with AI" calls `ai-assist`
  (`draft_audit`) to prefill every field from the company record — still fully editable before
  export, same "AI drafts, human confirms" rule as the email panel. "Generate PDF" renders a
  hidden 3-page template (`#audit-render-root` in `index.html`, styled in style.css's "Audit PDF —
  export render template" block using the brand palette — Ink `#141312` / Paper `#F4F1EA` /
  Signal `#FF4D2E` / Link `#0FB5A1` / Forest `#07312B` / Mist `#BFEDE5` / Stone `#79746B` — and
  IBM Plex Sans/Sans Arabic/Mono) with `html2canvas`, assembles the pages with `jsPDF`, and
  triggers `.save()`. Fully client-side, both libraries loaded from CDN in `index.html` — no
  server rendering, no PDF API, no added cost.
- **Price list PDF** — superseded by Prefile below; no longer separately out of scope.

### Prefile (catalog-driven document generator, no AI) — schema live, frontend not yet pushed

Separate from the AI-assist work above and has **zero dependency on it** — no calls to `ai-assist`,
no `ANTHROPIC_API_KEY` reference anywhere in this feature.

- **`supabase/migrations/0011_prefile_catalog.sql`** — new `prefile_catalog` table: `doc_type`
  (`audit`/`price_list`), `category` (`issue`/`recommendation`/`tier`, constrained to match
  `doc_type`), `lane` (`web`/`social`/`video`), `title`, `body`, `price` (tier rows only),
  `sort_order`. RLS: owner+teammate select, owner-only write (insert/update/delete) — same split as
  `it_assets`. **Applied and verified live** via the Management API (same path as `0005`–`0010`):
  RLS enabled, all 4 policies present, seed row counts confirmed — 6/5/5 issues and 5/4/4
  recommendations per web/social/video, 5/3/4 tiers per web/social/video. Seeded with the Haseeb
  Coffee audit's Web issues verbatim, generalized Web recommendations, new Social/Video
  issues+recommendations, and Web/Social/Video price tiers.
  **The price tier body copy is a placeholder** — `rabet-price-list.pdf` and its build script
  weren't available in the sandbox that wrote this, so the tier descriptions were written fresh
  from the given price ranges. Review/replace via Settings → Prefile Catalog before this goes out
  to a real client.
- **`prefile-catalog.html` + `.js`** — owner-only standalone page (same redirect-gate pattern as
  `it.html`), linked from the Settings modal (`#btn-settings-prefile-catalog`, gated to
  `isOwner()`). Add/edit/delete/reorder (up/down, swaps `sort_order`) catalog rows, grouped by lane
  → category, tabbed by `doc_type`. This is the only place catalog content is edited.
- **`prefile.html` + `.js`** — owner+teammate standalone page (`#btn-prefile` sidebar nav entry,
  gated to `isOwnerOrTeammate()`), the generator wizard: company search/select → doc type
  (Audit/Price List) → lane multi-select chips (1–3 of web/social/video) → catalog checklist
  (filtered to the selection, all checked by default, no free-text fields anywhere) → Generate.
  For Audit, the checklist is one combined issues list + one combined recommendations list (not
  split per lane); for Price List it's grouped by lane, previewing the page structure.
- **`prefile-render.js`** — the two document templates, same plain-JS-template + `html2canvas` +
  `jsPDF` approach as `audit.js` (see that entry above for why not React). Palette here is
  Prefile's own: Ink `#101010` / Paper `#F0F0E8`, with lane accents Signal `#F84828` (web) / Link
  `#08B0A0` (social) / Forest `#0C3A30` (video) — distinct from the older single-tenant Haseeb
  audit palette used by `audit.js`, per this feature's own spec.
  - **Audit**: cover → paginated Issues page(s) → paginated Recommendations page(s) → one Bottom
    Line page. Each item shows a small lane-colored dot (`.pf-lane-tag`, shared with the wizard
    checklist so the color always matches). Intro paragraph is static boilerplate. Bottom Line
    paragraph + 3 priorities are auto-composed from the checked issues (paragraph references which
    lanes were audited and how many issues were found; the 3 priorities are the first 3 checked
    issues in checklist order) — no free text.
  - **Price List**: cover → one page per *selected* lane (skipped entirely if a lane wasn't picked
    or has zero checked tiers) → closing page. Each lane page only lists its checked tiers.
  - **Pagination**: since checklist counts vary (unlike `audit.js`'s fixed 6+5), content pages are
    built by actually measuring item heights in a hidden DOM container (`paginateItems()` in
    `prefile-render.js`) against a fixed page budget, rather than assuming a fixed item count —
    overflow spills onto a "continued" page automatically.

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
  `role` (`'owner' | 'teammate' | 'viewer' | 'accountant' | 'it'` — `accountant` and `it` were each
  added later via their own `ALTER TYPE ADD VALUE` migration, see `0003a`/`0007a`). A trigger
  creates the profile row automatically when a new `auth.users` row is inserted (i.e., when Omar
  invites someone, or when an account is created directly via the admin API).
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

Implemented and passing (66/66 as of the `accountant`/`viewer` additions — see "Known gap" at the
top of this file for what's been added to the schema since without a matching matrix update) in
`supabase/tests/access-matrix.mjs` — mints real sessions via admin `generate_link` (magiclink) +
verify, no passwords touched, so it never interferes with a pending invite/recovery link.

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
