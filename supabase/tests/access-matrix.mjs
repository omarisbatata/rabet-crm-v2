// Access-test matrix from CLAUDE.md — verifies RLS behaves as designed for
// anon / teammate / owner against the live project, before any UI is trusted.
//
// Mints real sessions for the owner and a teammate via the admin
// generate_link + magiclink-verify flow (no password ever touched, so this
// never interferes with their pending invite/recovery links), then drives
// PostgREST directly with each role's token.
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

const OWNER_EMAIL    = 'oshalak@hotmail.com'
const TEAMMATE_EMAIL = 'luqman.elmaddah@gmail.com'

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
  console.log('Minting owner + teammate sessions...')
  const owner    = await mintSession(OWNER_EMAIL)
  const teammate = await mintSession(TEAMMATE_EMAIL)
  console.log(`owner=${owner.userId} teammate=${teammate.userId}\n`)

  const roles = { anon: { token: null }, teammate, owner }

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
  if (teammateCompanyId) {
    const res = await rest(`companies?id=eq.${teammateCompanyId}`, { method: 'PATCH', token: teammate.token, body: { stage: 'contacted' } })
    check('companies update (teammate)', true, res.ok)
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
  if (emailId) {
    const res = await rest(`emails?id=eq.${emailId}`, { method: 'PATCH', token: teammate.token, body: { subject: 'updated' } })
    check('emails update (teammate)', true, res.ok)
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
  if (templateId) {
    const res = await rest(`templates?id=eq.${templateId}`, { method: 'PATCH', token: teammate.token, body: { name: 'Access Test Template (edited)' } })
    check('templates update (teammate)', true, res.ok)
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

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(err => { console.error(err); process.exit(1) })
