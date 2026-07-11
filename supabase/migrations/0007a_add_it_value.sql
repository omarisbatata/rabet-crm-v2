-- Must run and commit before 0007_it_module.sql — Postgres won't let a newly
-- added enum value be referenced by a policy in the same transaction it was
-- added in (same constraint as 0002a/0003a).
alter type public.team_role add value if not exists 'it';
