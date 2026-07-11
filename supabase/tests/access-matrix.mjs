// Access-test matrix from CLAUDE.md — verifies RLS behaves as designed for
// anon / teammate / owner / viewer / accountant against the live project,
// before any UI is trusted.
//
// Mints real sessions for the owner, a teammate, and the viewer via the
// admin generate_link + magiclink-verify flow (no password ever touched, so
// this never interferes with their pending invite/recovery links). The
// accountant has no real account yet, so a dedicated fixture user is
// created for the run and deleted again at the end. Drives PostgREST
// directly with each role's token.
//
// Usage: node supabase/tests/access-matrix.mjs
// Reads SUPABASE_PROJECT_REF / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// from .env.local (repo root).

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '..', '.env.local')
const env = {}
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^=#]+)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
})

const REF     = env.SUPABASE_PROJECT_REF
const ANON    = env.SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
const BASE    = `https://${REF}.supabase.co`

const OWNER_EMAIL      = 'oshalak@hotmail.com'
const TEAMMATE_EMAIL   = 'luqman.elmaddah@gmail.com'
const VIEWER_EMAIL     = 'admin@rabet-crm.local'
// Dedicated fixture account for the accountant role — no real person behind
// it (unlike the shared viewer account above). Created fresh and deleted
// again at the end of the run so it leaves no permanent residue.
const ACCOUNTANT_EMAIL = 'access-test-accountant@rabet-crm.local'

const today = () => new Date().toISOString().slice(0, 10)

let pass = 0, fail = 0
function check(label, expected, actual, detail = '') {
  const ok = expected === actual
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  (expected ${expected}, got ${actual}) ${detail}`)
}

async function mintSession(email) {
  const genRes = await fetch(`${BASE}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email }),
  })
  const genJson = await genRes.json()
  if (!genRes.ok) throw new Error(`generate_link(${email}) failed: ${JSON.stringify(genJson)}`)
  const followRes = await fetch(genJson.action_link, { redirect: 'manual' })
  const loc = followRes.headers.get('location')
  const frag = new URLSearchParams(loc.split('#')[1])
  return { token: frag.get('access_token'), userId: genJson.id }
}

async function createFixtureAccountant() {
  const res = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ACCOUNTANT_EMAIL, email_confirm: true }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`create fixture accountant failed: ${JSON.stringify(json)}`)
  return json.id
}

async function deleteFixtureAccountant(userId) {
  if (!userId) return
  await fetch(`${BASE}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  })
}

async function rest(tableAndQuery, { method = 'GET', token, body } = {}) {
  const headers = { apikey: ANON, 'Content-Type': 'application/json' }
  headers.Authorization = `Bearer ${token || ANON}`
  if (method === 'POST') headers.Prefer = 'return=representation'
  if (method === 'PATCH') headers.Prefer = 'return=representation'
  const res = await fetch(`${BASE}/rest/v1/${tableAndQuery}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* not json */ }
  return { status: res.status, ok: res.ok, json, rowCount: Array.isArray(json) ? json.length : 0 }
}

async function main() {
  console.log('Minting owner + teammate + viewer sessions...')
  const owner    = await mintSession(OWNER_EMAIL)
  const teammate = await mintSession(TEAMMATE_EMAIL)
  const viewer   = await mintSession(VIEWER_EMAIL)

  console.log('Creating accountant fixture account...')
  const accountantUserId = await createFixtureAccountant()
  await rest(`profiles?id=eq.${accountantUserId}`, { method: 'PATCH', token: SERVICE, body: { role: 'accountant' } })
  const accountant = await mintSession(ACCOUNTANT_EMAIL)

  console.log(`owner=${owner.userId} teammate=${teammate.userId} viewer=${viewer.userId} accountant=${accountant.userId}\n`)

  const roles = { anon: { token: null }, teammate, owner, viewer, accountant }

  // ── profiles ────────────────────────────────────────────────────────────
  console.log('\n--- profiles ---')
  for (const [name, r] of Object.entries(roles)) {
    const res = await rest('profiles?select=id', { token: r.token })
    check(`profiles select (${name})`, name === 'anon' ? false : true, res.rowCount > 0 || (name !== 'anon' && res.ok))
  }
  // insert: no policy for anyone
  for (const [name, r] of Object.entries(roles)) {
    const res = await rest('profiles', { method: 'POST', token: r.token, body: { id: '00000000-0000-0000-0000-000000000000', full_name: 'x' } })
    check(`profiles insert denied (${name})`, true, !res.ok)
  }
  // update own full_name: allow
  {
    const res = await rest(`profiles?id=eq.${teammate.userId}`, { method: 'PATCH', token: teammate.token, body: { full_name: 'Luqman' } })
    check('profiles update own full_name (teammate)', true, res.ok && res.rowCount > 0)
  }
  // update own role: must be rejected by the with-check clause
  {
    const res = await rest(`profiles?id=eq.${teammate.userId}`, { method: 'PATCH', token: teammate.token, body: { role: 'owner' } })
    check('profiles self role-escalation blocked (teammate)', false, res.ok && res.rowCount > 0, `status=${res.status}`)
  }
  // delete: no policy for anyone (no-op, not an actual delete)
  {
    const res = await rest(`profiles?id=eq.${teammate.userId}`, { method: 'DELETE', token: owner.token })
    const stillThere = await rest(`profiles?id=eq.${teammate.userId}&select=id`, { token: SERVICE })
    check('profiles delete has no effect (owner, no policy)', true, stillThere.rowCount === 1)
  }

  // ── companies ───────────────────────────────────────────────────────────
  console.log('\n--- companies ---')
  for (const [name, r] of Object.entries(roles)) {
    const res = await rest('companies?select=id', { token: r.token })
    check(`companies select (${name})`, name !== 'anon', res.ok)
  }

  let teammateCompanyId, ownerCompanyId
  {
    const res = await rest('companies', { method: 'POST', token: teammate.token, body: { name: 'Access Test Co (teammate)' } })
    check('companies insert (teammate)', true, res.ok)
    teammateCompanyId = res.json?.[0]?.id
  }
  {
    const res = await rest('companies', { method: 'POST', token: owner.token, body: { name: 'Access Test Co (owner)' } })
    check('companies insert (owner)', true, res.ok)
    ownerCompanyId = res.json?.[0]?.id
  }
  {
    const res = await rest('companies', { method: 'POST', token: null, body: { name: 'Access Test Co (anon)' } })
    check('companies insert denied (anon)', true, !res.ok)
  }
  {
    const res = await rest('companies', { method: 'POST', token: viewer.token, body: { name: 'Access Test Co (viewer)' } })
    check('companies insert denied (viewer)', true, !res.ok || res.rowCount === 0)
  }
  if (teammateCompanyId) {
    const res = await rest(`companies?id=eq.${teammateCompanyId}`, { method: 'PATCH', token: teammate.token, body: { stage: 'contacted' } })
    check('companies update (teammate)', true, res.ok)
  }
  if (teammateCompanyId) {
    const res = await rest(`companies?id=eq.${teammateCompanyId}`, { method: 'PATCH', token: viewer.token, body: { stage: 'meeting_set' } })
    check('companies update denied (viewer)', true, res.rowCount === 0)
  }
  if (teammateCompanyId) {
    const res = await rest(`companies?id=eq.${teammateCompanyId}`, { method: 'DELETE', token: teammate.token })
    const stillThere = await rest(`companies?id=eq.${teammateCompanyId}&select=id`, { token: SERVICE })
    check('companies delete denied (teammate)', true, stillThere.rowCount === 1)
  }
  if (teammateCompanyId) {
    const res = await rest(`companies?id=eq.${teammateCompanyId}`, { method: 'DELETE', token: owner.token })
    check('companies delete allowed (owner)', true, res.ok)
  }
  if (ownerCompanyId) {
    await rest(`companies?id=eq.${ownerCompanyId}`, { method: 'DELETE', token: owner.token }) // cleanup
  }

  // ── emails ──────────────────────────────────────────────────────────────
  console.log('\n--- emails ---')
  for (const [name, r] of Object.entries(roles)) {
    const res = await rest('emails?select=id', { token: r.token })
    check(`emails select (${name})`, name !== 'anon', res.ok)
  }
  let emailId
  {
    const res = await rest('emails', {
      method: 'POST', token: teammate.token,
      body: { gmail_message_id: `test-${Date.now()}`, direction: 'outbound', to_addresses: 'x@example.com' },
    })
    check('emails insert outbound (teammate)', true, res.ok)
    emailId = res.json?.[0]?.id
  }
  {
    const res = await rest('emails', {
      method: 'POST', token: teammate.token,
      body: { gmail_message_id: `test-inbound-${Date.now()}`, direction: 'inbound', to_addresses: 'x@example.com' },
    })
    check('emails insert inbound denied for authenticated (teammate)', true, !res.ok)
  }
  {
    const res = await rest('emails', { method: 'POST', token: null, body: { gmail_message_id: `test-anon-${Date.now()}`, direction: 'outbound' } })
    check('emails insert denied (anon)', true, !res.ok)
  }
  {
    const res = await rest('emails', {
      method: 'POST', token: viewer.token,
      body: { gmail_message_id: `test-viewer-${Date.now()}`, direction: 'outbound', to_addresses: 'x@example.com' },
    })
    check('emails insert denied (viewer)', true, !res.ok || res.rowCount === 0)
  }
  if (emailId) {
    const res = await rest(`emails?id=eq.${emailId}`, { method: 'PATCH', token: teammate.token, body: { subject: 'updated' } })
    check('emails update (teammate)', true, res.ok)
  }
  if (emailId) {
    const res = await rest(`emails?id=eq.${emailId}`, { method: 'PATCH', token: viewer.token, body: { subject: 'viewer edit' } })
    check('emails update denied (viewer)', true, res.rowCount === 0)
  }
  if (emailId) {
    const res = await rest(`emails?id=eq.${emailId}`, { method: 'DELETE', token: teammate.token })
    const stillThere = await rest(`emails?id=eq.${emailId}&select=id`, { token: SERVICE })
    check('emails delete denied (teammate)', true, stillThere.rowCount === 1)
  }
  if (emailId) {
    const res = await rest(`emails?id=eq.${emailId}`, { method: 'DELETE', token: owner.token })
    check('emails delete allowed (owner)', true, res.ok)
  }

  // ── templates ───────────────────────────────────────────────────────────
  console.log('\n--- templates ---')
  for (const [name, r] of Object.entries(roles)) {
    const res = await rest('templates?select=id', { token: r.token })
    check(`templates select (${name})`, name !== 'anon', res.ok)
  }
  let templateId
  {
    const res = await rest('templates', { method: 'POST', token: teammate.token, body: { category: 'test', name: 'Access Test Template' } })
    check('templates insert (teammate)', true, res.ok)
    templateId = res.json?.[0]?.id
  }
  {
    const res = await rest('templates', { method: 'POST', token: null, body: { category: 'test', name: 'Access Test Template (anon)' } })
    check('templates insert denied (anon)', true, !res.ok)
  }
  {
    const res = await rest('templates', { method: 'POST', token: viewer.token, body: { category: 'test', name: 'Access Test Template (viewer)' } })
    check('templates insert denied (viewer)', true, !res.ok || res.rowCount === 0)
  }
  if (templateId) {
    const res = await rest(`templates?id=eq.${templateId}`, { method: 'PATCH', token: teammate.token, body: { name: 'Access Test Template (edited)' } })
    check('templates update (teammate)', true, res.ok)
  }
  if (templateId) {
    const res = await rest(`templates?id=eq.${templateId}`, { method: 'PATCH', token: viewer.token, body: { name: 'viewer edit' } })
    check('templates update denied (viewer)', true, res.rowCount === 0)
  }
  if (templateId) {
    const res = await rest(`templates?id=eq.${templateId}`, { method: 'DELETE', token: teammate.token })
    const stillThere = await rest(`templates?id=eq.${templateId}&select=id`, { token: SERVICE })
    check('templates delete denied (teammate)', true, stillThere.rowCount === 1)
  }
  if (templateId) {
    const res = await rest(`templates?id=eq.${templateId}`, { method: 'DELETE', token: owner.token })
    check('templates delete allowed (owner)', true, res.ok)
  }

  // ── finance_entries ─────────────────────────────────────────────────────
  console.log('\n--- finance_entries ---')

  let ownerEntryId
  {
    const res = await rest('finance_entries', {
      method: 'POST', token: owner.token,
      body: { entry_type: 'expense', payee: 'Access Test Vendor', amount: 10, entry_date: today() },
    })
    check('finance_entries insert (owner)', true, res.ok)
    ownerEntryId = res.json?.[0]?.id
  }

  for (const [name, r] of Object.entries(roles)) {
    const allowed = name === 'owner' || name === 'accountant'
    const res = await rest('finance_entries?select=id', { token: r.token })
    if (name === 'anon') { check(`finance_entries select denied (${name})`, true, !res.ok); continue }
    check(`finance_entries select (${name})`, allowed, res.ok && res.rowCount > 0)
  }

  {
    const res = await rest('finance_entries', {
      method: 'POST', token: accountant.token,
      body: { entry_type: 'salary', payee: 'Access Test Employee', amount: 500, entry_date: today() },
    })
    check('finance_entries insert (accountant)', true, res.ok)
  }
  {
    const res = await rest('finance_entries', {
      method: 'POST', token: teammate.token,
      body: { entry_type: 'expense', payee: 'Access Test (teammate)', amount: 1, entry_date: today() },
    })
    check('finance_entries insert denied (teammate)', true, !res.ok || res.rowCount === 0)
  }
  {
    const res = await rest('finance_entries', {
      method: 'POST', token: viewer.token,
      body: { entry_type: 'expense', payee: 'Access Test (viewer)', amount: 1, entry_date: today() },
    })
    check('finance_entries insert denied (viewer)', true, !res.ok || res.rowCount === 0)
  }
  {
    const res = await rest('finance_entries', {
      method: 'POST', token: null,
      body: { entry_type: 'expense', payee: 'Access Test (anon)', amount: 1, entry_date: today() },
    })
    check('finance_entries insert denied (anon)', true, !res.ok)
  }

  if (ownerEntryId) {
    const res = await rest(`finance_entries?id=eq.${ownerEntryId}`, { method: 'PATCH', token: accountant.token, body: { amount: 20 } })
    check('finance_entries update (accountant)', true, res.ok && res.rowCount > 0)
  }
  if (ownerEntryId) {
    const res = await rest(`finance_entries?id=eq.${ownerEntryId}`, { method: 'PATCH', token: teammate.token, body: { amount: 30 } })
    check('finance_entries update denied (teammate)', true, res.rowCount === 0)
  }
  if (ownerEntryId) {
    const res = await rest(`finance_entries?id=eq.${ownerEntryId}`, { method: 'PATCH', token: viewer.token, body: { amount: 30 } })
    check('finance_entries update denied (viewer)', true, res.rowCount === 0)
  }
  if (ownerEntryId) {
    const res = await rest(`finance_entries?id=eq.${ownerEntryId}`, { method: 'DELETE', token: teammate.token })
    const stillThere = await rest(`finance_entries?id=eq.${ownerEntryId}&select=id`, { token: SERVICE })
    check('finance_entries delete denied (teammate)', true, stillThere.rowCount === 1)
  }
  if (ownerEntryId) {
    const res = await rest(`finance_entries?id=eq.${ownerEntryId}`, { method: 'DELETE', token: owner.token })
    check('finance_entries delete allowed (owner)', true, res.ok)
  }

  // cleanup any rows left by the checks above (accountant's salary insert, etc.)
  await rest(`finance_entries?payee=like.Access*Test*`, { method: 'DELETE', token: SERVICE })

  console.log('\nDeleting accountant fixture account...')
  await deleteFixtureAccountant(accountantUserId)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(err => { console.error(err); process.exit(1) })
