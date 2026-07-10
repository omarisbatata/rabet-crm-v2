-- Must run and commit before 0002_viewer_role.sql — Postgres won't let a
-- newly added enum value be referenced by a policy in the same transaction
-- it was added in.
alter type public.team_role add value if not exists 'viewer';
