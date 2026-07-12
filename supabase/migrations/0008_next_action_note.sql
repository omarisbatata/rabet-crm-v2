-- Follow-up reminders: `companies.followup_at` already is the "next action
-- date" (used for the sidebar's upcoming/overdue counts and the table's
-- Follow-up column) — no need for a second date column alongside it. This
-- just adds the note that was missing: what the next action actually is.
alter table public.companies
  add column next_action_note text;
