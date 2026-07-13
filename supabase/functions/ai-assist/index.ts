// Rabet CRM — shared AI assist layer (email drafts, audit drafts, and any
// future drafting task) via the Anthropic Messages API.
//
// Deploy: `supabase functions deploy ai-assist`. Then add the
// ANTHROPIC_API_KEY secret: `supabase secrets set ANTHROPIC_API_KEY=...`.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// Supabase — do not set those yourself.
//
// Auth model: same JWT-forwarding pattern as send-email — the browser calls
// this via supabase-js's `functions.invoke`, which forwards the caller's
// Supabase Auth session as a Bearer JWT. This function verifies that JWT,
// then additionally checks the caller's `profiles.role` is `owner` or
// `teammate` before doing anything else — viewer/accountant/it are rejected,
// on top of the frontend already hiding the buttons for those roles.
//
// Every response here is a draft only — nothing in this function writes to
// the database or sends anything. Task handlers below fetch whatever CRM
// context they need with the service_role client (safe: the JWT/role check
// above already stands in for RLS, same trust boundary as send-email).
//
// Adding a new task: add a `case` to the switch in the handler and a
// corresponding `draftX` function above it. No new function, no new auth
// wiring, no new secret.

// @ts-ignore - remote import, resolved by the Supabase Edge Runtime at deploy time
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MODEL = 'claude-sonnet-5'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ── Anthropic call ───────────────────────────────────────────────────────

async function callAnthropic(system: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error('Anthropic API returned no text')
  return text
}

// The model is asked for bare JSON but sometimes still wraps it in a
// ```json fence despite the instruction — strip that before parsing.
function parseJsonReply(text: string): Record<string, unknown> {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  return JSON.parse(stripped)
}

// ── Task: draft_email ────────────────────────────────────────────────────
// context: { company_id, template_id? } → { subject, body }

async function draftEmail(supabase: SupabaseClient, context: Record<string, unknown>) {
  const companyId = context.company_id as string | undefined
  const templateId = context.template_id as string | undefined
  if (!companyId) throw new Error('draft_email requires company_id')

  const { data: company, error: companyError } = await supabase
    .from('companies').select('*').eq('id', companyId).single()
  if (companyError || !company) throw new Error('company not found')

  let template: { name?: string; subject?: string; body?: string } | null = null
  if (templateId) {
    const { data } = await supabase.from('templates').select('*').eq('id', templateId).maybeSingle()
    template = data
  }

  const prompt = `Write an outbound email to a prospect/client for Rabet, a small Syrian digital agency.

Company: ${company.name}
Industry: ${company.industry || 'unknown'}
Service being discussed: ${company.service || 'unspecified'}
Pipeline stage: ${company.stage}
Notes on file: ${company.notes || 'none'}
Next action: ${company.next_action_note || 'none'}
${template ? `\nBase this on the "${template.name}" template:\nSubject: ${template.subject || ''}\nBody:\n${template.body || ''}\n` : ''}
Write a short, direct, professional email (a few short paragraphs at most) tailored to this specific company's context. Respond with ONLY a JSON object, no markdown fence, no commentary:
{"subject": "...", "body": "..."}`

  const raw = await callAnthropic(
    'You draft outbound sales/relationship emails for Rabet, a small Syrian digital agency. Always respond with strict JSON matching the requested shape, nothing else.',
    prompt,
  )
  const parsed = parseJsonReply(raw)
  return { subject: String(parsed.subject || ''), body: String(parsed.body || '') }
}

// ── Task: draft_audit ────────────────────────────────────────────────────
// context: { company_id, lang? } → full audit field set for the PDF form

async function draftAudit(supabase: SupabaseClient, context: Record<string, unknown>) {
  const companyId = context.company_id as string | undefined
  const lang = context.lang === 'ar' ? 'ar' : 'en'
  if (!companyId) throw new Error('draft_audit requires company_id')

  const { data: company, error: companyError } = await supabase
    .from('companies').select('*').eq('id', companyId).single()
  if (companyError || !company) throw new Error('company not found')

  const languageLine = lang === 'ar' ? 'Write every text field in Arabic.' : 'Write every text field in English.'

  const prompt = `Draft a free website/marketing audit for a prospective client of Rabet, a Syrian digital agency, to be handed over as a short PDF. This is a sales tool — direct and specific, written the way an agency writes an audit meant to convert a lead, not a generic checklist.

Company: ${company.name}
Industry: ${company.industry || 'unknown'}
Service being pitched: ${company.service || 'unspecified'}
Contact: ${[company.contact_type, company.contact_value].filter(Boolean).join(' — ') || 'unknown'}
Notes on file: ${company.notes || 'none'}

${languageLine} You do not have access to the company's actual website — write generic-but-plausible placeholder findings that a human will hand-edit with real specifics before sending; keep every item short enough to quickly correct.

Respond with ONLY a JSON object, no markdown fence, no commentary, matching exactly this shape:
{
  "client_name": "string",
  "date": "YYYY-MM-DD",
  "intro_line": "one or two sentences introducing what the audit covers",
  "fix_now": [ {"title": "string", "body": "string"} ],
  "what_to_add": [ {"title": "string", "body": "string"} ],
  "bottom_line": { "paragraph": "string", "priorities": ["string", "string", "string"] }
}
fix_now must have exactly 6 items, what_to_add exactly 5, bottom_line.priorities exactly 3.`

  const raw = await callAnthropic(
    'You draft website audit content for Rabet, a small Syrian digital agency, used as a sales tool for prospective clients. Always respond with strict JSON matching the requested shape, nothing else.',
    prompt,
  )
  // deno-lint-ignore no-explicit-any
  const parsed = parseJsonReply(raw) as any
  const item = (i: any) => ({ title: String(i?.title || ''), body: String(i?.body || '') })

  return {
    client_name: String(parsed.client_name || company.name || ''),
    date: String(parsed.date || new Date().toISOString().slice(0, 10)),
    intro_line: String(parsed.intro_line || ''),
    fix_now: Array.isArray(parsed.fix_now) ? parsed.fix_now.slice(0, 6).map(item) : [],
    what_to_add: Array.isArray(parsed.what_to_add) ? parsed.what_to_add.slice(0, 5).map(item) : [],
    bottom_line: {
      paragraph: String(parsed.bottom_line?.paragraph || ''),
      priorities: Array.isArray(parsed.bottom_line?.priorities)
        ? parsed.bottom_line.priorities.slice(0, 3).map(String)
        : [],
    },
  }
}

// ── Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  if (!jwt) return jsonResponse({ error: 'missing authorization' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
  if (userError || !userData?.user) {
    return jsonResponse({ error: 'not authorized' }, 401)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role').eq('id', userData.user.id).single()
  if (profileError || !profile || !['owner', 'teammate'].includes(profile.role)) {
    return jsonResponse({ error: 'not authorized' }, 403)
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid JSON' }, 400)
  }

  const { task, context } = payload as { task?: string; context?: Record<string, unknown> }
  if (!task) return jsonResponse({ error: 'missing task' }, 400)

  try {
    switch (task) {
      case 'draft_email':
        return jsonResponse(await draftEmail(supabase, context || {}))
      case 'draft_audit':
        return jsonResponse(await draftAudit(supabase, context || {}))
      default:
        return jsonResponse({ error: `unknown task: ${task}` }, 400)
    }
  } catch (err) {
    return jsonResponse({ error: `ai-assist failed: ${(err as Error).message}` }, 502)
  }
})
