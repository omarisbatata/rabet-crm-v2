-- ═══════════════════════════════════════════════════════════════════
-- finance_entries — company spending + salary tracking. Restricted to
-- owner and accountant roles only; teammate/viewer get no access at all
-- (deny by default — no policy for either role on this table).
--
-- Run 0003a_add_accountant_value.sql (the ALTER TYPE ADD VALUE) first, in
-- its own transaction — see that file's header comment.
-- ═══════════════════════════════════════════════════════════════════
create table public.finance_entries (
  id          uuid primary key default gen_random_uuid(),
  entry_type  text not null check (entry_type in ('expense', 'salary')),
  payee       text not null,          -- who was paid / vendor name / employee name
  category    text,                   -- e.g. rent, software, salary, freelancer
  amount      numeric not null,
  currency    text not null default 'USD',
  entry_date  date not null,
  notes       text,
  created_by  uuid references public.profiles(id) default auth.uid(),
  created_at  timestamptz default now()
);

create index finance_entries_type_idx  on public.finance_entries (entry_type);
create index finance_entries_date_idx  on public.finance_entries (entry_date);

alter table public.finance_entries enable row level security;

create policy "finance_entries_owner_all"
  on public.finance_entries for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

create policy "finance_entries_accountant_all"
  on public.finance_entries for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant'));

-- No policy for teammate/viewer — RLS enabled with no matching policy means
-- every operation is denied for them, same "deny by default" pattern as the
-- rest of this schema.

revoke all on public.finance_entries from anon;
