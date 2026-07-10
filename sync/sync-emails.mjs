// Rabet CRM — Gmail inbound sync.
//
// Runs on a GitHub Actions schedule (see ../.github/workflows/sync-emails.yml).
// Polls shalakomar9@gmail.com over IMAP, parses new mail, and writes it into
// Supabase's public.emails table using the service_role key (bypasses RLS —
// this script never runs in a browser and the key is never shipped to the
// frontend). See CLAUDE.md's "Gmail integration" section for the security
// model: unlike the old repo, there's no crm_insert_inbound_email() RPC here
// — RLS + service_role bypass replaces the old crm_* function scheme, so this
// does a plain PostgREST insert with `Prefer: resolution=ignore-duplicates`
// against the unique `gmail_message_id` constraint for dedupe.
//
// Watermark: instead of a separate state table, each run asks Supabase for
// the newest inbound email it already has and searches IMAP from just before
// that point (buffered, since IMAP SINCE is date-only, not time-of-day).
// First run ever (no inbound rows yet) falls back to SYNC_START_DATE — the
// ship date — per spec: no historical import.

import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

const GMAIL_USER = required('GMAIL_USER')
const GMAIL_APP_PASSWORD = required('GMAIL_APP_PASSWORD')
const SUPABASE_URL = required('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = required('SUPABASE_SERVICE_ROLE_KEY')
const SYNC_START_DATE = required('SYNC_START_DATE') // e.g. '2026-07-10' — no import before this date

const OVERLAP_BUFFER_DAYS = 2 // IMAP SINCE is date-only; re-scan a small buffer and rely on dedupe

function required(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

async function supabaseRest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Supabase ${path} -> ${res.status}: ${body}`)
  }
  return res.status === 204 ? null : res.json()
}

async function getSearchSinceDate() {
  const rows = await supabaseRest(
    'emails?select=received_at&direction=eq.inbound&order=received_at.desc&limit=1'
  )
  const shipDate = new Date(`${SYNC_START_DATE}T00:00:00Z`)
  if (!rows || rows.length === 0) {
    return shipDate
  }
  const watermark = new Date(rows[0].received_at)
  watermark.setUTCDate(watermark.getUTCDate() - OVERLAP_BUFFER_DAYS)
  return watermark > shipDate ? watermark : shipDate
}

function pickThreadId(parsed) {
  if (parsed.references) {
    const refs = Array.isArray(parsed.references) ? parsed.references : [parsed.references]
    if (refs.length > 0) return refs[0]
  }
  if (parsed.inReplyTo) return parsed.inReplyTo
  return parsed.messageId || null
}

async function insertInboundEmail(parsed, fallbackId) {
  const payload = {
    gmail_message_id: parsed.messageId || fallbackId,
    thread_id: pickThreadId(parsed),
    direction: 'inbound',
    from_address: parsed.from?.text || '',
    to_addresses: parsed.to?.text || '',
    subject: parsed.subject || '',
    body_text: parsed.text || '',
    body_html: parsed.html || '',
    received_at: (parsed.date || new Date()).toISOString(),
  }

  // Dedupe via PostgREST upsert-ignore against the unique gmail_message_id
  // constraint. Returns [] (empty array) when the row already existed.
  const result = await supabaseRest('emails?on_conflict=gmail_message_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(payload),
  })

  return Array.isArray(result) && result.length > 0
}

async function main() {
  const sinceDate = await getSearchSinceDate()
  console.log(`Searching INBOX since ${sinceDate.toISOString().slice(0, 10)}`)

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    logger: false,
  })

  let inserted = 0
  let deduped = 0
  let failed = 0

  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  try {
    const uids = await client.search({ since: sinceDate }, { uid: true })
    console.log(`Found ${uids.length} message(s) in the search window`)

    for (const uid of uids) {
      try {
        const { content } = await client.download(uid, undefined, { uid: true })
        const parsed = await simpleParser(content)
        const wasInserted = await insertInboundEmail(parsed, `no-msgid-${uid}`)
        wasInserted ? inserted++ : deduped++
      } catch (err) {
        failed++
        console.error(`Failed on UID ${uid}:`, err.message)
      }
    }
  } finally {
    lock.release()
    await client.logout()
  }

  console.log(`Done. Inserted: ${inserted}, already synced: ${deduped}, failed: ${failed}`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Sync failed:', err)
  process.exit(1)
})
