-- Link finance_entries to a CRM company so the owner dashboard can show a
-- real per-client breakdown (mainly for income rows — "this month's Deals
-- revenue came from Golden Potato" — but left open to any entry type).
-- Nullable: most expense/salary rows have no client at all.
alter table public.finance_entries
  add column company_id uuid references public.companies(id) on delete set null;

create index finance_entries_company_id_idx on public.finance_entries (company_id);

-- No RLS change needed — existing owner/accountant policies on
-- finance_entries already cover this new column.
