-- Adds 'income' as a third finance_entries.entry_type, alongside the
-- existing 'expense' and 'salary'. No RLS changes — same owner/accountant
-- CRUD policies from 0003_finance.sql apply regardless of entry_type.
alter table public.finance_entries drop constraint finance_entries_entry_type_check;
alter table public.finance_entries add constraint finance_entries_entry_type_check
  check (entry_type in ('expense', 'salary', 'income'));
