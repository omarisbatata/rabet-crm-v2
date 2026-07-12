// Rabet CRM — daily overdue/due-today follow-up digest, to the owner only.
//
// Runs on a GitHub Actions schedule (see ../.github/workflows/daily-digest.yml).
// Reads public.companies with the service_role key (bypasses RLS — same
// trust boundary as sync-emails.mjs) and emails a summary straight over
// Gmail SMTP if there's anything overdue or due today. Deliberately not
// routed through the send-email Edge Function: that function requires a
// real logged-in user's JWT (see supabase/functions/send-email/index.ts),
// which a cron job doesn't have — so this sends directly instead, reusing
// the same GMAIL_USER/GMAIL_APP_PASSWORD secret already set up for that
// function and for sync-emails.mjs.
//
// Recipient is fixed to the owner (DIGEST_TO) rather than per-assignee, by
// design — see CLAUDE.md.

import nodemailer from 'nodemailer'

const GMAIL_USER = required('GMAIL_USER')
const GMAIL_APP_PASSWORD = required('GMAIL_APP_PASSWORD')
const SUPABASE_URL = required('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = required('SUPABASE_SERVICE_ROLE_KEY')
const DIGEST_TO = required('DIGEST_TO')

function required(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

async function supabaseRest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Supabase ${path} -> ${res.status}: ${body}`)
  }
  return res.json()
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

async function main() {
  const today = new Date().toISOString().slice(0, 10)

  const [companies, profiles] = await Promise.all([
    supabaseRest(
      'companies?select=name,stage,assigned_to,followup_at,next_action_note'
      + '&followup_at=not.is.null&stage=not.in.(closed_won,dead)&order=followup_at.asc'
    ),
    supabaseRest('profiles?select=id,full_name'),
  ])

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]))

  const due = companies
    .map(c => ({ ...c, fuDate: c.followup_at.slice(0, 10) }))
    .filter(c => c.fuDate <= today)

  if (!due.length) {
    console.log('Nothing overdue or due today — no digest sent.')
    return
  }

  const overdue = due.filter(c => c.fuDate < today)
  const dueToday = due.filter(c => c.fuDate === today)

  const section = (title, rows) => rows.length ? `
    <h3 style="margin:16px 0 6px;">${title} (${rows.length})</h3>
    <ul style="margin:0;padding-left:20px;">
      ${rows.map(c => `<li><strong>${esc(c.name)}</strong> — due ${esc(c.fuDate)}
        ${c.assigned_to ? ` · ${esc(profileMap[c.assigned_to] || '')}` : ''}
        ${c.next_action_note ? `<br/><span style="color:#555;">${esc(c.next_action_note)}</span>` : ''}
      </li>`).join('')}
    </ul>` : ''

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111;">
      <p>${due.length} compan${due.length === 1 ? 'y needs' : 'ies need'} a follow-up today.</p>
      ${section('⚠ Overdue', overdue)}
      ${section('Due Today', dueToday)}
    </div>`

  const text = due.map(c =>
    `${c.fuDate < today ? 'OVERDUE' : 'DUE TODAY'} — ${c.name}${c.assigned_to ? ' (' + (profileMap[c.assigned_to] || '') + ')' : ''}`
    + (c.next_action_note ? `\n  ${c.next_action_note}` : '')
  ).join('\n\n')

  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })

  await transport.sendMail({
    from: GMAIL_USER,
    to: DIGEST_TO,
    subject: `رابط CRM — ${due.length} follow-up${due.length === 1 ? '' : 's'} due (${overdue.length} overdue)`,
    text,
    html,
  })

  console.log(`Digest sent to ${DIGEST_TO}: ${overdue.length} overdue, ${dueToday.length} due today.`)
}

main().catch(err => {
  console.error('Daily digest failed:', err)
  process.exit(1)
})
