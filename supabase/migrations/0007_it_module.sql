-- ═══════════════════════════════════════════════════════════════════
-- IT module — mirrors how Finance was scoped to the accountant role:
-- full access for 'it'/'owner', narrow self-service access for everyone
-- else. Run 0007a_add_it_value.sql (the ALTER TYPE ADD VALUE) first, in
-- its own transaction — see that file's header comment.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- it_assets — infrastructure & tools (domains, hosting, subscriptions).
-- No employee access at all — deny by default for every role but it/owner.
-- ─────────────────────────────────────────────────────────────────────
create table public.it_assets (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null check (type in ('domain', 'hosting', 'subscription', 'tool', 'other')),
  provider      text,
  renewal_date  date,
  cost          numeric,
  currency      text,
  notes         text,
  managed_by    uuid references public.profiles(id) default auth.uid(),
  created_at    timestamptz not null default now()
);

create index it_assets_renewal_idx on public.it_assets (renewal_date);

alter table public.it_assets enable row level security;

create policy "it_assets_it_owner_all"
  on public.it_assets for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('it', 'owner')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('it', 'owner')));

revoke all on public.it_assets from anon;


-- ─────────────────────────────────────────────────────────────────────
-- it_equipment — device/equipment tracking. Employees get read-only
-- visibility into their own assigned gear, nothing else.
-- ─────────────────────────────────────────────────────────────────────
create table public.it_equipment (
  id             uuid primary key default gen_random_uuid(),
  item_name      text not null,
  category       text not null check (category in ('laptop', 'phone', 'peripheral', 'other')),
  assigned_to    uuid references public.profiles(id),
  serial_number  text,
  status         text not null default 'in_use' check (status in ('in_use', 'spare', 'repair', 'retired')),
  notes          text,
  created_at     timestamptz not null default now()
);

create index it_equipment_assigned_idx on public.it_equipment (assigned_to);
create index it_equipment_status_idx   on public.it_equipment (status);

alter table public.it_equipment enable row level security;

create policy "it_equipment_it_owner_all"
  on public.it_equipment for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('it', 'owner')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('it', 'owner')));

create policy "it_equipment_select_own"
  on public.it_equipment for select
  to authenticated
  using (assigned_to = auth.uid());

revoke all on public.it_equipment from anon;


-- ─────────────────────────────────────────────────────────────────────
-- it_tickets — structured support requests. Employees can create tickets
-- and see/update only their own; it/owner see and manage everything.
-- assigned_to defaults to "the IT person" (first profile with role='it')
-- so new tickets land in someone's queue without the employee having to
-- pick a name.
-- ─────────────────────────────────────────────────────────────────────
create table public.it_tickets (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null references public.profiles(id) default auth.uid(),
  assigned_to uuid references public.profiles(id),
  subject     text not null,
  description text,
  status      text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index it_tickets_created_by_idx  on public.it_tickets (created_by);
create index it_tickets_assigned_idx    on public.it_tickets (assigned_to);
create index it_tickets_status_idx      on public.it_tickets (status);

alter table public.it_tickets enable row level security;

create policy "it_tickets_it_owner_all"
  on public.it_tickets for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('it', 'owner')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('it', 'owner')));

create policy "it_tickets_insert_own"
  on public.it_tickets for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "it_tickets_select_own"
  on public.it_tickets for select
  to authenticated
  using (created_by = auth.uid());

-- Employees can update their own ticket rows (e.g. adding detail). RLS
-- checks row ownership, not which columns changed, so this technically
-- lets an employee edit their own ticket's status/priority too — accepted
-- at this team size rather than adding a column-restricting trigger, same
-- trade-off already made for companies/emails/templates elsewhere in this
-- schema.
create policy "it_tickets_update_own"
  on public.it_tickets for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

revoke all on public.it_tickets from anon;

create function public.touch_it_ticket()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger it_tickets_touch
  before update on public.it_tickets
  for each row execute function public.touch_it_ticket();

-- Postgres doesn't allow a subquery in a column DEFAULT, so "assigned_to
-- defaults to the IT person" is done with a BEFORE INSERT trigger instead —
-- only fills it in when the caller left it null, picking an arbitrary
-- profile with role='it' if more than one exists.
create function public.default_it_ticket_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is null then
    select id into new.assigned_to from public.profiles where role = 'it' limit 1;
  end if;
  return new;
end;
$$;

create trigger it_tickets_default_assignee
  before insert on public.it_tickets
  for each row execute function public.default_it_ticket_assignee();


-- ─────────────────────────────────────────────────────────────────────
-- it_ticket_comments — thread per ticket. Access inherits from the
-- parent ticket: it/owner see/post on every thread, an employee sees/
-- posts only on threads for tickets they created. No update/delete —
-- a support thread is append-only, same as reasoning behind other
-- append-only history in this app.
-- ─────────────────────────────────────────────────────────────────────
create table public.it_ticket_comments (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.it_tickets(id) on delete cascade,
  author_id  uuid references public.profiles(id) default auth.uid(),
  body       text not null,
  created_at timestamptz not null default now()
);

create index it_ticket_comments_ticket_idx on public.it_ticket_comments (ticket_id);

alter table public.it_ticket_comments enable row level security;

create policy "it_ticket_comments_select"
  on public.it_ticket_comments for select
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('it', 'owner'))
    or exists (select 1 from public.it_tickets tk where tk.id = ticket_id and tk.created_by = auth.uid())
  );

create policy "it_ticket_comments_insert"
  on public.it_ticket_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (
      exists (select 1 from public.profiles where id = auth.uid() and role in ('it', 'owner'))
      or exists (select 1 from public.it_tickets tk where tk.id = ticket_id and tk.created_by = auth.uid())
    )
  );

revoke all on public.it_ticket_comments from anon;


-- ─────────────────────────────────────────────────────────────────────
-- it_messages — 1:1 direct chat between an employee and "the IT person".
-- Not a group chat: every row is one sender + one recipient. it/owner
-- can see every conversation (useful if there's ever more than one IT
-- profile, or the owner wants visibility); everyone else sees only
-- threads they're a party to.
-- ─────────────────────────────────────────────────────────────────────
create table public.it_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) default auth.uid(),
  recipient_id uuid not null references public.profiles(id),
  body         text not null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);

create index it_messages_sender_idx    on public.it_messages (sender_id);
create index it_messages_recipient_idx on public.it_messages (recipient_id);
create index it_messages_created_idx   on public.it_messages (created_at);

alter table public.it_messages enable row level security;

create policy "it_messages_select_it_owner_all"
  on public.it_messages for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('it', 'owner')));

create policy "it_messages_select_own"
  on public.it_messages for select
  to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "it_messages_insert_own"
  on public.it_messages for insert
  to authenticated
  with check (sender_id = auth.uid());

-- Recipient-side update exists so the reader can stamp read_at on open.
-- Same column-level caveat as it_tickets_update_own: RLS grants the whole
-- row, not just read_at, to the recipient — accepted at this team size.
create policy "it_messages_update_recipient"
  on public.it_messages for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

revoke all on public.it_messages from anon;
