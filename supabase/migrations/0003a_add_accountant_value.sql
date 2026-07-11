-- Must run and commit before 0003_finance.sql — Postgres won't let a newly
-- added enum value be referenced by a policy in the same transaction it was
-- added in (same constraint as 0002a_add_viewer_value.sql).
alter type public.team_role add value if not exists 'accountant';
