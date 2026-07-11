// Capture the URL hash before supabase-js consumes it (it clears the hash
// after parsing an invite/recovery token), so we can tell an invite/recovery
// landing apart from a normal page load.
const INITIAL_HASH = window.location.hash

// ── Constants ─────────────────────────────────────────────────────────────────
const PALETTE = [
  { clr: '#9D8FFA', bg: 'rgba(157,143,250,.15)' },
  { clr: '#F59E0B', bg: 'rgba(245,158,11,.12)' },
  { clr: '#38BDF8', bg: 'rgba(56,189,248,.12)' },
  { clr: '#34D399', bg: 'rgba(52,211,153,.12)' },
]

const STAGES = ['not_contacted', 'contacted', 'meeting_set', 'closed_won', 'dead']
const STAGE_EN = {
  not_contacted: { clr: '#58607A', label: '● Not Contacted', cls: 's0-badge' },
  contacted:     { clr: '#F59E0B', label: '● Contacted',     cls: 's1-badge' },
  meeting_set:   { clr: '#38BDF8', label: '● Meeting Set',   cls: 's2-badge' },
  closed_won:    { clr: '#34D399', label: '● Closed ✓',      cls: 's3-badge' },
  dead:          { clr: '#F43F5E', label: '● Dead ✗',        cls: 's4-badge' },
}
const STAGE_AR = {
  not_contacted: { clr: '#58607A', label: '● لم يُتواصل',    cls: 's0-badge' },
  contacted:     { clr: '#F59E0B', label: '● تم التواصل',   cls: 's1-badge' },
  meeting_set:   { clr: '#38BDF8', label: '● اجتماع محدد',  cls: 's2-badge' },
  closed_won:    { clr: '#34D399', label: '● مُغلق ✓',       cls: 's3-badge' },
  dead:          { clr: '#F43F5E', label: '● ميت ✗',         cls: 's4-badge' },
}

const INDUSTRIES = [
  'Restaurant / Food','Retail / Shop','Real Estate','Medical / Pharmacy',
  'Education','Tech / IT','Fashion / Clothing','Construction','Logistics',
  'Media / Marketing','Services','Manufacturing','Other',
]

const SERVICES_EN = [
  'Website Design & Dev','Social Media Mgmt','Digital Advertising',
  'Brand Identity','Content Creation & Photography','SEO & Optimisation','Multiple / TBD',
]
const SERVICES_AR = [
  'تصميم مواقع','إدارة سوشال ميديا','إعلانات رقمية',
  'هوية بصرية','تصوير ومحتوى','تحسين محركات البحث','متعدد / غير محدد',
]

const T = {
en: {
  login_title: 'Sign in',
  login_email: 'Email',
  login_password: 'Password',
  login_enter: 'Sign In',
  login_forgot: 'Forgot password?',
  login_error: 'Wrong email or password.',
  reset_sent: 'Password reset email sent.',
  setpass_title: 'Set your password',
  setpass_sub: "You're new here — set a password you'll use to log in from now on.",
  setpass_new: 'New password',
  setpass_confirm: 'Confirm password',
  setpass_btn: 'Set Password & Enter',
  pass_too_short: 'Password must be at least 8 characters.',
  pass_no_match: "Passwords don't match.",
  team_label: 'Team',
  pipeline_label: 'Pipeline',
  add: '+ Add Company',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
  logout: 'Log Out',
  settings: 'Settings',
  export: 'Export CSV',
  search: 'Search companies…',
  filter_all: 'All Statuses',
  all_industries: 'All Industries',
  all_team: 'All',
  total_suffix: 'companies',
  no_results: 'No companies match your filters.',
  confirm_delete: 'Delete this company? This cannot be undone.',
  no_selection: 'Select a company first.',
  owner_only: 'Only the owner can do that.',
  status_not_contacted: 'Not Contacted', status_contacted: 'Contacted',
  status_meeting_set: 'Meeting Set',   status_closed_won: 'Closed ✓', status_dead: 'Dead ✗',
  col_name: 'Company', col_industry: 'Industry', col_contact: 'Contact',
  col_service: 'Service', col_status: 'Status', col_followup: 'Follow-up',
  col_by: 'By', col_updated: 'Updated', col_notes: 'Notes',
  f_name: 'Company Name', f_industry: 'Industry',
  f_contact_type: 'Contact Type', f_contact_val: 'Contact Value',
  f_service: 'Service', f_status: 'Status', f_owner: 'Assigned To',
  f_followup: 'Next Follow-up', f_followup_hint: 'YYYY-MM-DD  (leave blank if none)',
  f_notes: 'Notes',
  phone: '📞  Phone', email: '✉  Email', social: '⚡  Social',
  ctx_status: 'Set Status', ctx_wa: 'Open WhatsApp',
  upcoming: 'upcoming', overdue: 'overdue',
  drive_on: 'Connected to Supabase ✓', drive_off: 'Supabase unreachable',
  refreshed: 'Updated by team',
  settings_change_password: 'Change Your Password',
  settings_new: 'New password', settings_confirm: 'Confirm new password',
  saved: 'Saved.',
  add_title: 'Add Company', edit_title: 'Edit Company',
  lang_switch: 'العربية',
  inbox_nav: '✉ Inbox',
  inbox_title: 'Unlinked Emails',
  inbox_empty: 'No unlinked emails.',
  inbox_select_hint: 'Select an email to view it.',
  inbox_from: 'From', inbox_to: 'To',
  inbox_link_btn: 'Link',
  inbox_linked_msg: 'Linked to company.',
  correspondence_label: 'Correspondence',
  correspondence_empty: 'No linked emails yet.',
  reply_placeholder: 'Write a reply…',
  reply_send: 'Send Reply',
  reply_sending: 'Sending…',
  reply_sent: 'Reply sent.',
  compose_btn: '+ Compose',
  compose_to: 'To',
  compose_subject: 'Subject',
  compose_body: 'Message',
  compose_send: 'Send',
  compose_sent: 'Email sent.',
  send_failed: 'Send failed: ',
  templates_nav: '✎ Templates',
  templates_empty: 'No templates yet.',
  template_new: '+ New Template',
  template_category: 'Category',
  template_name: 'Name',
  template_subject: 'Subject',
  template_body: 'Body',
  template_use: 'Use…',
  template_delete_confirm: 'Delete this template?',
  finance_nav: '$ Finance',
  dashboard_nav: '◆ Dashboard',
  it_nav: '⚙ IT',
  ithelp_nav: '? Get IT Help',
},
ar: {
  login_title: 'تسجيل الدخول',
  login_email: 'البريد الإلكتروني',
  login_password: 'كلمة المرور',
  login_enter: 'دخول',
  login_forgot: 'نسيت كلمة المرور؟',
  login_error: 'بريد إلكتروني أو كلمة مرور خاطئة.',
  reset_sent: 'تم إرسال رابط إعادة التعيين.',
  setpass_title: 'اضبط كلمة المرور',
  setpass_sub: 'أول مرة تدخل. اختر كلمة مرور ستستخدمها لتسجيل الدخول لاحقاً.',
  setpass_new: 'كلمة مرور جديدة',
  setpass_confirm: 'تأكيد كلمة المرور',
  setpass_btn: 'حفظ والدخول',
  pass_too_short: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
  pass_no_match: 'كلمتا المرور غير متطابقتين.',
  team_label: 'الفريق',
  pipeline_label: 'المسار',
  add: '+ إضافة شركة',
  edit: 'تعديل',
  delete: 'حذف',
  save: 'حفظ',
  cancel: 'إلغاء',
  logout: 'تسجيل الخروج',
  settings: 'الإعدادات',
  export: 'تصدير CSV',
  search: 'بحث في الشركات…',
  filter_all: 'كل الحالات',
  all_industries: 'كل القطاعات',
  all_team: 'الكل',
  total_suffix: 'شركة',
  no_results: 'لا توجد شركات تطابق الفلتر.',
  confirm_delete: 'حذف هذه الشركة؟ لا يمكن التراجع.',
  no_selection: 'اختر شركة أولاً.',
  owner_only: 'هذا الإجراء لصاحب الحساب فقط.',
  status_not_contacted: 'لم يُتواصل', status_contacted: 'تم التواصل',
  status_meeting_set: 'اجتماع محدد', status_closed_won: 'مُغلق ✓', status_dead: 'ميت ✗',
  col_name: 'الشركة', col_industry: 'القطاع', col_contact: 'التواصل',
  col_service: 'الخدمة', col_status: 'الحالة', col_followup: 'موعد متابعة',
  col_by: 'بواسطة', col_updated: 'آخر تحديث', col_notes: 'ملاحظات',
  f_name: 'اسم الشركة', f_industry: 'القطاع',
  f_contact_type: 'نوع التواصل', f_contact_val: 'بيانات التواصل',
  f_service: 'الخدمة', f_status: 'الحالة', f_owner: 'المسؤول',
  f_followup: 'موعد المتابعة التالي', f_followup_hint: 'YYYY-MM-DD',
  f_notes: 'ملاحظات',
  phone: '📞  هاتف', email: '✉  بريد', social: '⚡  سوشال',
  ctx_status: 'تغيير الحالة', ctx_wa: 'فتح واتساب',
  upcoming: 'قادمة', overdue: 'متأخرة',
  drive_on: 'متصل بـ Supabase ✓', drive_off: 'Supabase غير متاح',
  refreshed: 'تحديث من الفريق',
  settings_change_password: 'تغيير كلمة المرور',
  settings_new: 'كلمة مرور جديدة', settings_confirm: 'تأكيد كلمة المرور',
  saved: 'تم الحفظ.',
  add_title: 'إضافة شركة', edit_title: 'تعديل شركة',
  lang_switch: 'English',
  inbox_nav: '✉ البريد',
  inbox_title: 'رسائل غير مرتبطة',
  inbox_empty: 'لا توجد رسائل غير مرتبطة.',
  inbox_select_hint: 'اختر رسالة لعرضها.',
  inbox_from: 'من', inbox_to: 'إلى',
  inbox_link_btn: 'ربط',
  inbox_linked_msg: 'تم الربط بالشركة.',
  correspondence_label: 'المراسلات',
  correspondence_empty: 'لا توجد رسائل مرتبطة بعد.',
  reply_placeholder: 'اكتب رداً…',
  reply_send: 'إرسال الرد',
  reply_sending: 'جارٍ الإرسال…',
  reply_sent: 'تم إرسال الرد.',
  compose_btn: '+ رسالة جديدة',
  compose_to: 'إلى',
  compose_subject: 'الموضوع',
  compose_body: 'الرسالة',
  compose_send: 'إرسال',
  compose_sent: 'تم إرسال البريد.',
  send_failed: 'فشل الإرسال: ',
  templates_nav: '✎ القوالب',
  templates_empty: 'لا توجد قوالب بعد.',
  template_new: '+ قالب جديد',
  template_category: 'الفئة',
  template_name: 'الاسم',
  template_subject: 'الموضوع',
  template_body: 'النص',
  template_use: 'استخدام…',
  template_delete_confirm: 'حذف هذا القالب؟',
  finance_nav: '$ المالية',
  dashboard_nav: '◆ لوحة التحكم',
  it_nav: '⚙ تقنية المعلومات',
  ithelp_nav: '? طلب مساعدة تقنية',
},
}

// ── State ─────────────────────────────────────────────────────────────────────
let sb
let state = {
  user:      null,    // { id, email, full_name, role }
  profiles:  [],       // team directory
  profileMap: {},      // id -> { full_name, role, clr, bg, initials }
  companies: [],
  emails:    [],       // unlinked emails
  templates: [],
  selectedEmailId: null,
  lang:      localStorage.getItem('crm_lang') || 'en',
  selected:  null,    // selected company id
  filters:   { stage: '', industry: '', owner: '', query: '' },
  sort:      { col: null, rev: false },
  editingId: null,    // company being edited in modal
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const t   = key => T[state.lang][key] || key
const qs  = sel => document.querySelector(sel)
const qsa = sel => document.querySelectorAll(sel)
const el  = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e }
const today = () => new Date().toISOString().slice(0,10)

function esc(str) {
  if (!str && str !== 0) return ''
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function sbar(msg, ms = 4000) {
  const e = qs('#sbar-msg')
  e.textContent = msg
  if (ms) setTimeout(() => { if (e.textContent === msg) e.textContent = '' }, ms)
}

function showToast(msg) {
  const toast = qs('#toast')
  toast.textContent = msg
  toast.classList.remove('hidden')
  clearTimeout(showToast._t)
  showToast._t = setTimeout(() => toast.classList.add('hidden'), 3500)
}

function initialsFor(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function isOwner() { return state.user?.role === 'owner' }
function isViewer() { return state.user?.role === 'viewer' }
function isAccountant() { return state.user?.role === 'accountant' }
function isIT() { return state.user?.role === 'it' }
function canSeeFinance() { return isOwner() || isAccountant() }
function canSeeIT() { return isOwner() || isIT() }

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  applyLang()

  const isInviteOrRecovery = /type=(invite|recovery)/.test(INITIAL_HASH)
  const { data: { session } } = await sb.auth.getSession()

  if (session && isInviteOrRecovery) {
    showSetPasswordScreen()
  } else if (session) {
    await afterLogin()
  } else {
    showLoginScreen()
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function showLoginScreen() {
  qs('#login-screen').classList.remove('hidden')
  qs('#app').classList.add('hidden')
  qs('#step-login').classList.remove('hidden')
  qs('#step-setpass').classList.add('hidden')
  qs('#login-error').classList.add('hidden')
}

function showSetPasswordScreen() {
  qs('#login-screen').classList.remove('hidden')
  qs('#app').classList.add('hidden')
  qs('#step-login').classList.add('hidden')
  qs('#step-setpass').classList.remove('hidden')
}

qs('#btn-login').addEventListener('click', async () => {
  const email = qs('#input-email').value.trim()
  const password = qs('#input-password').value
  const errEl = qs('#login-error')
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) {
    errEl.textContent = t('login_error')
    errEl.classList.remove('hidden')
    return
  }
  errEl.classList.add('hidden')
  await afterLogin()
})
qs('#input-password').addEventListener('keydown', e => { if (e.key === 'Enter') qs('#btn-login').click() })

qs('#btn-forgot').addEventListener('click', async () => {
  const email = qs('#input-email').value.trim()
  if (!email) { qs('#input-email').focus(); return }
  await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname })
  sbar(t('reset_sent'))
})

qs('#btn-setpass').addEventListener('click', async () => {
  const p1 = qs('#input-new-password').value
  const p2 = qs('#input-confirm-password').value
  const errEl = qs('#setpass-error')
  if (p1.length < 8) { errEl.textContent = t('pass_too_short'); errEl.classList.remove('hidden'); return }
  if (p1 !== p2)     { errEl.textContent = t('pass_no_match');  errEl.classList.remove('hidden'); return }
  const { error } = await sb.auth.updateUser({ password: p1 })
  if (error) { errEl.textContent = error.message; errEl.classList.remove('hidden'); return }
  errEl.classList.add('hidden')
  await afterLogin()
})

async function afterLogin() {
  const { data: { user } } = await sb.auth.getUser()
  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', user.id).single()
  if (error || !profile) { sbar('Could not load profile: ' + (error?.message || 'not found')); return }
  state.user = { id: user.id, email: user.email, full_name: profile.full_name, role: profile.role }
  qs('#login-screen').classList.add('hidden')
  await bootApp()
}

function logout() {
  stopHeartbeatLoop()
  sb.auth.signOut()
  state.user = null
  state.companies = []
  showLoginScreen()
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function bootApp() {
  qs('#app').classList.remove('hidden')
  await loadProfiles()
  buildSidebar()
  buildTopbar()
  buildTableHead()
  applyLang()
  setupKeyboard()
  await loadCompanies()
  if (isOwner()) await refreshInboxBadge()
  await ensureLoginSession()
  startHeartbeatLoop()
  // Realtime isn't wired up (RLS-aware realtime is more moving parts than this
  // 3-person team needs) — poll for changes made by other team members instead.
  setInterval(() => { loadCompanies(true); if (isOwner()) refreshInboxBadge() }, 15000)
}

// ── Login session tracking (feeds the owner dashboard's CRM login hours) ────
// Every signed-in user gets one login_sessions row per continuous stretch of
// having the app open. A heartbeat every ~4 min keeps last_heartbeat_at fresh;
// if the gap since the last heartbeat exceeds 15 min (tab closed, laptop
// slept), the next boot starts a fresh row instead of resuming the old one —
// so session duration (last_heartbeat_at - login_at) never silently spans a
// period where the app wasn't actually open.
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000
const SESSION_GAP_MS        = 15 * 60 * 1000

let currentSessionId = null
let heartbeatTimer   = null

function sessionStorageKey(userId) { return `crm_session_${userId}` }

async function ensureLoginSession() {
  const key = sessionStorageKey(state.user.id)
  let stored = null
  try { stored = JSON.parse(localStorage.getItem(key) || 'null') } catch { stored = null }
  const now = Date.now()

  if (stored?.id && (now - stored.lastHeartbeat) < SESSION_GAP_MS) {
    currentSessionId = stored.id
    await sendHeartbeat()
    return
  }

  const { data, error } = await sb.from('login_sessions')
    .insert({ user_id: state.user.id })
    .select('id')
    .single()
  if (error || !data) return
  currentSessionId = data.id
  localStorage.setItem(key, JSON.stringify({ id: currentSessionId, lastHeartbeat: now }))
}

async function sendHeartbeat() {
  if (!currentSessionId) return
  const { error } = await sb.from('login_sessions')
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq('id', currentSessionId)
  if (error) return
  localStorage.setItem(sessionStorageKey(state.user.id), JSON.stringify({ id: currentSessionId, lastHeartbeat: Date.now() }))
}

function startHeartbeatLoop() {
  clearInterval(heartbeatTimer)
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
}

function stopHeartbeatLoop() {
  clearInterval(heartbeatTimer)
  heartbeatTimer = null
  currentSessionId = null
}

async function loadProfiles() {
  const { data, error } = await sb.from('profiles').select('*').order('created_at')
  if (error) { setDriveBadge(false); return }
  state.profiles = data || []
  state.profileMap = {}
  state.profiles.forEach((p, i) => {
    const pal = PALETTE[i % PALETTE.length]
    state.profileMap[p.id] = { ...p, clr: pal.clr, bg: pal.bg, initials: initialsFor(p.full_name) }
  })
}

// ── Data ──────────────────────────────────────────────────────────────────────
let _lastSig = ''

function setDriveBadge(ok) {
  const badge = qs('#drive-badge')
  if (!badge) return
  badge.textContent = ok ? t('drive_on') : t('drive_off')
  badge.className = 'drive-badge ' + (ok ? 'drive-on' : 'drive-off')
}

async function loadCompanies(poll = false) {
  const { data, error } = await sb.from('companies').select('*').order('updated_at', { ascending: false })
  if (error) { setDriveBadge(false); return }
  setDriveBadge(true)
  state.companies = data || []

  // Detect a change made by someone else (list is ordered newest-first).
  const top = state.companies[0]
  const sig = top ? top.id + '|' + top.updated_at : ''
  if (poll && sig && sig !== _lastSig && top.modified_by && top.modified_by !== state.user.id) {
    const name = state.profileMap[top.modified_by]?.full_name || '?'
    showToast(`↺  ${t('refreshed')} — ${name}`)
  }
  _lastSig = sig
  render()
}

async function saveCompany(payload, id = null) {
  let error
  if (id) {
    ;({ error } = await sb.from('companies').update(payload).eq('id', id))
  } else {
    ;({ error } = await sb.from('companies').insert(payload))
  }
  if (error) { sbar('Error: ' + error.message); return false }
  await loadCompanies()
  return true
}

async function removeCompany(id) {
  const { error } = await sb.from('companies').delete().eq('id', id)
  if (error) { sbar(isOwner() ? 'Error: ' + error.message : t('owner_only')); return }
  await loadCompanies()
}

// ── Outbound send (shared by Inbox reply + Correspondence compose) ─────────
async function sendEmailViaEdge({ to, subject, bodyText, threadId, companyId }) {
  const { data, error } = await sb.functions.invoke('send-email', {
    body: {
      to_addresses: to, subject, body_text: bodyText,
      thread_id: threadId || null, company_id: companyId || null,
    },
  })
  if (error) return { ok: false, message: error.message }
  if (data && data.error) return { ok: false, message: data.error }
  return { ok: true }
}

// ── Inbox (unlinked emails) ──────────────────────────────────────────────────
async function loadUnlinkedEmails() {
  const { data, error } = await sb.from('emails').select('*').is('company_id', null).order('received_at', { ascending: false })
  if (error) { sbar('Error: ' + error.message); return }
  state.emails = data || []
}

async function refreshInboxBadge() {
  await loadUnlinkedEmails()
  const badge = qs('#inbox-badge')
  if (badge) {
    if (state.emails.length) { badge.textContent = String(state.emails.length); badge.classList.remove('hidden') }
    else badge.classList.add('hidden')
  }
  if (!qs('#inbox-overlay').classList.contains('hidden')) renderInboxList()
}

async function showInbox() {
  qs('#inbox-overlay').classList.remove('hidden')
  state.selectedEmailId = null
  await loadUnlinkedEmails()
  renderInboxList()
  renderInboxDetail()
}

function hideInbox() {
  qs('#inbox-overlay').classList.add('hidden')
}

function renderInboxList() {
  const list = qs('#inbox-list')
  list.innerHTML = ''
  if (!state.emails.length) {
    list.innerHTML = `<div class="inbox-empty">${t('inbox_empty')}</div>`
    return
  }
  state.emails.forEach(e => {
    const item = el('div', 'inbox-item' + (state.selectedEmailId === e.id ? ' selected' : ''))
    item.innerHTML = `
      <div class="inbox-item-from">${esc(e.from_address)}</div>
      <div class="inbox-item-subject" title="${esc(e.subject)}">${esc(e.subject || '(no subject)')}</div>
      <div class="inbox-item-date">${(e.received_at||'').slice(0,16).replace('T',' ')}</div>
    `
    item.addEventListener('click', () => {
      state.selectedEmailId = e.id
      renderInboxList()
      renderInboxDetail()
    })
    list.appendChild(item)
  })
}

function renderInboxDetail() {
  const wrap = qs('#inbox-detail')
  const e = state.emails.find(x => x.id === state.selectedEmailId)
  if (!e) { wrap.innerHTML = `<div class="inbox-empty">${t('inbox_select_hint')}</div>`; return }

  const companyOpts = state.companies
    .slice().sort((a,b) => a.name.localeCompare(b.name))
    .map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')

  wrap.innerHTML = `
    <div class="inbox-detail-header">
      <div class="inbox-detail-subject">${esc(e.subject || '(no subject)')}</div>
      <div class="inbox-detail-meta">${t('inbox_from')}: ${esc(e.from_address)}</div>
      <div class="inbox-detail-meta">${t('inbox_to')}: ${esc(e.to_addresses)}</div>
      <div class="inbox-detail-meta">${(e.received_at||'').slice(0,16).replace('T',' ')}</div>
    </div>
    <div class="inbox-link-row">
      <select class="field-select" id="inbox-link-select">${companyOpts}</select>
      <button class="btn-primary" id="inbox-link-btn" style="width:auto;padding:9px 16px;">${t('inbox_link_btn')}</button>
    </div>
    <iframe class="inbox-body-frame" id="inbox-body-frame" sandbox=""></iframe>
    <div class="reply-box">
      <textarea class="field-textarea" id="reply-text" placeholder="${t('reply_placeholder')}"></textarea>
      <div class="reply-actions">
        <button class="btn-primary" id="reply-send-btn" style="width:auto;padding:9px 16px;">${t('reply_send')}</button>
      </div>
    </div>
  `

  const frame = qs('#inbox-body-frame')
  frame.srcdoc = e.body_html
    ? e.body_html
    : `<pre style="font-family:inherit;white-space:pre-wrap;padding:12px;margin:0;">${esc(e.body_text || '')}</pre>`

  qs('#reply-send-btn').addEventListener('click', async () => {
    const body = qs('#reply-text').value.trim()
    if (!body) return
    const btn = qs('#reply-send-btn')
    btn.disabled = true
    btn.textContent = t('reply_sending')
    const subject = /^re:/i.test(e.subject || '') ? e.subject : `Re: ${e.subject || ''}`
    const result = await sendEmailViaEdge({
      to: e.from_address, subject, bodyText: body, threadId: e.thread_id,
    })
    btn.disabled = false
    btn.textContent = t('reply_send')
    if (!result.ok) { sbar(t('send_failed') + result.message); return }
    showToast(t('reply_sent'))
    qs('#reply-text').value = ''
  })

  qs('#inbox-link-btn').addEventListener('click', async () => {
    const companyId = qs('#inbox-link-select').value
    if (!companyId) return
    const { error } = await sb.from('emails')
      .update({ company_id: companyId, linked_at: new Date().toISOString() })
      .eq('id', e.id)
    if (error) { sbar('Error: ' + error.message); return }
    showToast(t('inbox_linked_msg'))
    state.selectedEmailId = null
    await loadUnlinkedEmails()
    renderInboxList()
    renderInboxDetail()
    const badge = qs('#inbox-badge')
    if (badge) {
      if (state.emails.length) { badge.textContent = String(state.emails.length); badge.classList.remove('hidden') }
      else badge.classList.add('hidden')
    }
  })
}

async function loadCompanyEmails(companyId) {
  const { data, error } = await sb.from('emails').select('*').eq('company_id', companyId).order('received_at', { ascending: false })
  const wrap = qs('#company-emails-list')
  if (!wrap) return
  if (error || !data || !data.length) {
    wrap.innerHTML = `<div class="field-hint">${t('correspondence_empty')}</div>`
    return
  }
  wrap.innerHTML = data.map(e => `
    <div class="company-email-row">
      <span class="company-email-dir ${e.direction}">${e.direction === 'inbound' ? '↓' : '↑'}</span>
      <span class="company-email-subj" title="${esc(e.subject)}">${esc(e.subject || '(no subject)')}</span>
      <span class="company-email-date">${(e.received_at||'').slice(0,10)}</span>
    </div>
  `).join('')
}

qs('#inbox-close').addEventListener('click', hideInbox)
qs('#inbox-overlay').addEventListener('click', e => { if (e.target === qs('#inbox-overlay')) hideInbox() })

// ── Templates ─────────────────────────────────────────────────────────────────
async function loadTemplates() {
  const { data, error } = await sb.from('templates').select('*').order('category').order('name')
  if (error) { sbar('Error: ' + error.message); return }
  state.templates = data || []
}

async function showTemplates() {
  qs('#templates-overlay').classList.remove('hidden')
  await loadTemplates()
  renderTemplates()
}

function renderTemplates(editingId) {
  const body = qs('#templates-body')
  const editing = editingId !== undefined
    ? state.templates.find(x => x.id === editingId) || {}
    : null

  const listHtml = state.templates.length
    ? state.templates.map(tpl => `
      <div class="template-row" data-id="${tpl.id}">
        <div class="template-row-main">
          <div class="template-row-name">${esc(tpl.name)}</div>
          <div class="template-row-cat">${esc(tpl.category)}</div>
        </div>
        ${isViewer() ? '' : `
        <div class="template-row-actions">
          <button data-act="edit">${t('edit')}</button>
          <button data-act="delete">${t('delete')}</button>
        </div>`}
      </div>
    `).join('')
    : `<div class="field-hint">${t('templates_empty')}</div>`

  body.innerHTML = `
    <div class="template-list">${listHtml}</div>
    ${isViewer() ? '' : `<button class="btn-ghost" id="btn-template-new" style="width:auto;padding:8px 14px;">${t('template_new')}</button>
    <div id="template-form" class="field-group hidden" style="margin-top:16px;">
      <label class="field-label">${t('template_category')}</label>
      <input class="field-input" id="tpl-category" value="${esc(editing?.category || '')}" />
      <label class="field-label">${t('template_name')}</label>
      <input class="field-input" id="tpl-name" value="${esc(editing?.name || '')}" />
      <label class="field-label">${t('template_subject')}</label>
      <input class="field-input" id="tpl-subject" value="${esc(editing?.subject || '')}" />
      <label class="field-label">${t('template_body')}</label>
      <textarea class="field-textarea" id="tpl-body">${esc(editing?.body || '')}</textarea>
      <div class="modal-footer">
        <button class="btn-primary" id="btn-template-save">${t('save')}</button>
        <button class="btn-ghost" id="btn-template-cancel">${t('cancel')}</button>
      </div>
    </div>`}
  `

  if (isViewer()) return

  const form = qs('#template-form')
  if (editing !== null) form.classList.remove('hidden')

  qs('#btn-template-new').addEventListener('click', () => renderTemplates(null))
  qs('#btn-template-cancel')?.addEventListener('click', () => renderTemplates())

  qs('#btn-template-save')?.addEventListener('click', async () => {
    const payload = {
      category: qs('#tpl-category').value.trim(),
      name:     qs('#tpl-name').value.trim(),
      subject:  qs('#tpl-subject').value.trim(),
      body:     qs('#tpl-body').value.trim(),
    }
    if (!payload.name) return
    const id = editing?.id
    const { error } = id
      ? await sb.from('templates').update(payload).eq('id', id)
      : await sb.from('templates').insert(payload)
    if (error) { sbar('Error: ' + error.message); return }
    await loadTemplates()
    renderTemplates()
  })

  qsa('.template-row').forEach(row => {
    const id = row.dataset.id
    row.querySelector('[data-act="edit"]').addEventListener('click', () => renderTemplates(id))
    row.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      if (!confirm(t('template_delete_confirm'))) return
      const { error } = await sb.from('templates').delete().eq('id', id)
      if (error) { sbar(isOwner() ? 'Error: ' + error.message : t('owner_only')); return }
      await loadTemplates()
      renderTemplates()
    })
  })
}

qs('#btn-templates').addEventListener('click', showTemplates)
qs('#templates-close').addEventListener('click', () => qs('#templates-overlay').classList.add('hidden'))
qs('#templates-overlay').addEventListener('click', e => { if (e.target === qs('#templates-overlay')) qs('#templates-overlay').classList.add('hidden') })

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  renderTable()
  renderStats()
  renderFollowup()
}

function filteredCompanies() {
  const { stage, industry, owner, query } = state.filters
  return state.companies.filter(c => {
    if (stage         && c.stage !== stage) return false
    if (industry      && c.industry !== industry) return false
    if (owner         && c.assigned_to !== owner && c.modified_by !== owner) return false
    if (query) {
      const q = query.toLowerCase()
      const assignedName = state.profileMap[c.assigned_to]?.full_name || ''
      const modifiedName = state.profileMap[c.modified_by]?.full_name || ''
      const fields = [c.name, c.industry, c.contact_value, c.service, c.notes, assignedName, modifiedName]
      if (!fields.some(f => f && f.toLowerCase().includes(q))) return false
    }
    return true
  })
}

function renderTable() {
  const data   = filteredCompanies()
  const tbody  = qs('#tbl-body')
  const empty  = qs('#empty-state')
  const scfg   = state.lang === 'ar' ? STAGE_AR : STAGE_EN
  const tod    = today()
  tbody.innerHTML = ''

  if (!data.length) { empty.classList.remove('hidden'); qs('#total-count').textContent = ''; return }
  empty.classList.add('hidden')
  qs('#total-count').textContent = `${data.length} ${t('total_suffix')}`

  data.forEach(c => {
    const fuDate = c.followup_at ? c.followup_at.slice(0, 10) : ''
    const isOverdue = fuDate && fuDate < tod && c.stage !== 'closed_won' && c.stage !== 'dead'
    const s = scfg[c.stage] || scfg.not_contacted
    const modProfile = state.profileMap[c.modified_by]
    const byClr  = modProfile?.clr || '#58607A'
    const byBg   = modProfile?.bg  || 'rgba(88,96,122,.12)'
    const byInit = modProfile?.initials || '?'
    const fuDisp = isOverdue
      ? `<span class="overdue-date">⚠ ${fuDate}</span>`
      : fuDate
    const contact = [c.contact_type, c.contact_value].filter(Boolean).join('  ')

    const tr = el('tr')
    if (isOverdue) tr.classList.add('overdue')
    if (state.selected === c.id) tr.classList.add('selected')

    tr.innerHTML = `
      <td title="${esc(c.name)}">${esc(c.name)}</td>
      <td>${esc(c.industry)}</td>
      <td title="${esc(contact)}">${esc(contact)}</td>
      <td title="${esc(c.service)}">${esc(c.service)}</td>
      <td class="col-status"><span class="status-badge ${s.cls}">${s.label}</span></td>
      <td>${fuDisp}</td>
      <td><span class="by-init" style="color:${byClr};background:${byBg}" title="${esc(modProfile?.full_name || '')}">${byInit}</span></td>
      <td>${(c.updated_at||'').slice(0,16).replace('T',' ')}</td>
      <td title="${esc(c.notes)}">${esc(c.notes)}</td>
    `
    tr.addEventListener('click', () => { selectRow(c.id); showViewOverlay(c) })
    tr.addEventListener('dblclick', () => { selectRow(c.id); showModal(c) })
    tr.addEventListener('contextmenu', e => { e.preventDefault(); selectRow(c.id); showCtxMenu(e, c) })
    tbody.appendChild(tr)
  })
}

function selectRow(id) {
  state.selected = id
  qsa('tbody tr').forEach(tr => tr.classList.remove('selected'))
  const rows = qsa('tbody tr')
  const data = filteredCompanies()
  const idx  = data.findIndex(c => c.id === id)
  if (idx >= 0 && rows[idx]) rows[idx].classList.add('selected')
}

function renderStats() {
  const scfg  = state.lang === 'ar' ? STAGE_AR : STAGE_EN
  const stats = qs('#pipeline-stats')
  stats.innerHTML = ''
  STAGES.forEach(stage => {
    const s     = scfg[stage]
    const count = state.companies.filter(c => c.stage === stage).length
    const row = el('div', 'stat-row')
    row.innerHTML = `<div class="stat-left"><span class="stat-dot" style="color:${s.clr}">●</span><span class="stat-name">${t('status_'+stage)}</span></div><span class="stat-count" style="color:${s.clr}">${count}</span>`
    row.addEventListener('click', () => {
      state.filters.stage = state.filters.stage === stage ? '' : stage
      qs('#filter-status').value = state.filters.stage
      renderTable()
    })
    stats.appendChild(row)
  })
}

function renderFollowup() {
  const tod     = today()
  const active  = state.companies.filter(c => c.stage !== 'closed_won' && c.stage !== 'dead')
  const upcoming= active.filter(c => c.followup_at && c.followup_at.slice(0,10) >= tod).length
  const overdue = active.filter(c => c.followup_at && c.followup_at.slice(0,10) < tod).length
  const wrap = qs('#sb-followup')
  wrap.innerHTML = ''
  if (upcoming) {
    const d = el('div','followup-line')
    d.style.color = '#9D8FFA'
    d.textContent = `● ${upcoming} ${t('upcoming')}`
    wrap.appendChild(d)
  }
  if (overdue) {
    const d = el('div','followup-line')
    d.style.color = '#F43F5E'
    d.textContent = `⚠ ${overdue} ${t('overdue')}`
    wrap.appendChild(d)
  }
}

// ── Build static UI ───────────────────────────────────────────────────────────
function buildSidebar() {
  const grid = qs('#team-grid')
  grid.innerHTML = ''

  const allBtn = el('button', `team-btn all${state.filters.owner === '' ? ' active' : ''}`, t('all_team'))
  if (!state.filters.owner) { allBtn.style.background = 'rgba(124,106,247,.15)'; allBtn.style.color = '#9D8FFA'; allBtn.style.borderColor = '#7C6AF7' }
  allBtn.addEventListener('click', () => setOwnerFilter(''))
  grid.appendChild(allBtn)

  state.profiles.forEach(p => {
    const prof = state.profileMap[p.id]
    const b = el('button', `team-btn${state.filters.owner === p.id ? ' active' : ''}`)
    b.textContent = prof.initials
    b.title = prof.full_name
    b.style.color = prof.clr
    if (state.filters.owner === p.id) { b.style.background = prof.bg; b.style.borderColor = prof.clr; b.style.color = 'white' }
    b.addEventListener('click', () => setOwnerFilter(p.id))
    grid.appendChild(b)
  })

  qs('#sb-user').textContent = state.user?.full_name || ''
  qs('#btn-add').classList.toggle('hidden', isViewer())
  qs('#btn-add').onclick      = () => showModal(null)
  qs('#btn-inbox').classList.toggle('hidden', !isOwner())
  qs('#btn-inbox').onclick    = showInbox
  qs('#btn-finance').classList.toggle('hidden', !canSeeFinance())
  qs('#btn-finance').onclick  = () => window.open('finance.html', '_blank')
  qs('#btn-dashboard').classList.toggle('hidden', !isOwner())
  qs('#btn-dashboard').onclick = () => window.open('dashboard.html', '_blank')
  qs('#btn-it').classList.toggle('hidden', !canSeeIT())
  qs('#btn-it').onclick      = () => window.open('it.html', '_blank')
  qs('#btn-ithelp').onclick  = () => window.open('ithelp.html', '_blank')
  qs('#btn-export').onclick   = exportCSV
  qs('#btn-settings').onclick = showSettings
  qs('#btn-lang').textContent = t('lang_switch')
  qs('#btn-lang').onclick     = toggleLang
}

function buildTopbar() {
  const statusSel = qs('#filter-status')
  statusSel.innerHTML = `<option value="">${t('filter_all')}</option>`
  STAGES.forEach(stage => { statusSel.innerHTML += `<option value="${stage}">${t('status_'+stage)}</option>` })
  statusSel.value   = state.filters.stage
  statusSel.onchange = e => { state.filters.stage = e.target.value; renderTable() }

  const indSel = qs('#filter-industry')
  indSel.innerHTML = `<option value="">${t('all_industries')}</option>`
  INDUSTRIES.forEach(ind => { indSel.innerHTML += `<option value="${esc(ind)}">${esc(ind)}</option>` })
  indSel.value   = state.filters.industry
  indSel.onchange = e => { state.filters.industry = e.target.value; renderTable() }

  qs('#search-input').placeholder = t('search')
  qs('#search-input').oninput     = e => { state.filters.query = e.target.value.trim(); renderTable() }

  qs('#btn-edit').onclick   = () => {
    const c = state.companies.find(x => x.id === state.selected)
    if (!c) { sbar(t('no_selection')); return }
    showModal(c)
  }
  qs('#btn-delete').onclick = handleDelete
  qs('#btn-edit').classList.toggle('hidden', isViewer())
  qs('#btn-delete').classList.toggle('hidden', isViewer())
}

function setupKeyboard() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (!qs('#modal-overlay').classList.contains('hidden') ||
        !qs('#settings-overlay').classList.contains('hidden') ||
        !qs('#view-overlay').classList.contains('hidden')) return
    if ((e.key === 'n' || e.key === 'N') && !isViewer()) showModal(null)
    if (e.key === 'e' || e.key === 'E') {
      const c = state.companies.find(x => x.id === state.selected)
      if (c) showModal(c)
    }
    if (e.key === 'Delete' && !isViewer()) handleDelete()
    if (e.ctrlKey && e.key === 'f') { e.preventDefault(); qs('#search-input').focus() }
    if (e.key === 'Escape') { qs('#search-input').value = ''; state.filters.query = ''; renderTable() }
  })
}

function buildTableHead() {
  const cols = ['col_name','col_industry','col_contact','col_service',
                'col_status','col_followup','col_by','col_updated','col_notes']
  const sortKeys = { col_name:'name', col_industry:'industry', col_service:'service',
                     col_status:'stage', col_followup:'followup_at', col_updated:'updated_at' }
  const head = qs('#tbl-head')
  head.innerHTML = ''
  const tr = el('tr')
  cols.forEach(c => {
    const th = el('th', '', t(c))
    const key = sortKeys[c]
    if (key) {
      th.addEventListener('click', () => setSort(key))
      if (state.sort.col === key) th.classList.add('sorted')
    }
    tr.appendChild(th)
  })
  head.appendChild(tr)
}

function setOwnerFilter(owner) {
  state.filters.owner = owner
  buildSidebar()
  renderTable()
}

function setSort(col) {
  if (state.sort.col === col) state.sort.rev = !state.sort.rev
  else { state.sort.col = col; state.sort.rev = false }
  state.companies.sort((a, b) => {
    let av = a[col] ?? '', bv = b[col] ?? ''
    if (col === 'stage') { av = STAGES.indexOf(av); bv = STAGES.indexOf(bv) }
    if (col === 'followup_at') { av = av || '9999-99-99'; bv = bv || '9999-99-99' }
    const res = av < bv ? -1 : av > bv ? 1 : 0
    return state.sort.rev ? -res : res
  })
  buildTableHead()
  renderTable()
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal(company) {
  hideViewOverlay()
  state.editingId = company?.id || null
  const overlay   = qs('#modal-overlay')
  const body      = qs('#modal-body')
  const scfg      = state.lang === 'ar' ? STAGE_AR : STAGE_EN
  const services  = state.lang === 'ar' ? SERVICES_AR : SERVICES_EN
  const ctypes    = [t('phone'), t('email'), t('social')]

  qs('#modal-title').textContent = company ? t('edit_title') : t('add_title')

  const ctype = company?.contact_type || ctypes[0]
  const cstage = company?.stage || 'not_contacted'

  body.innerHTML = `
    <div class="field-group">
      <label class="field-label">${t('f_name')}</label>
      <input class="field-input" id="f-name" value="${esc(company?.name||'')}" />
    </div>
    <div class="field-group">
      <label class="field-label">${t('f_industry')}</label>
      <select class="field-select" id="f-industry">
        <option value=""></option>
        ${INDUSTRIES.map(i => `<option value="${esc(i)}"${company?.industry===i?' selected':''}>${esc(i)}</option>`).join('')}
      </select>
    </div>
    <div class="field-group">
      <label class="field-label">${t('f_contact_type')}</label>
      <div class="pill-group" id="ctype-pills">
        ${ctypes.map(ct => `<button class="pill-btn${ct===ctype?' active':''}" data-ct="${esc(ct)}">${ct}</button>`).join('')}
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">${t('f_contact_val')}</label>
      <input class="field-input" id="f-cval" value="${esc(company?.contact_value||'')}" />
    </div>
    <div class="field-group">
      <label class="field-label">${t('f_service')}</label>
      <select class="field-select" id="f-service">
        <option value=""></option>
        ${services.map(s => `<option value="${esc(s)}"${company?.service===s?' selected':''}>${esc(s)}</option>`).join('')}
      </select>
    </div>
    <div class="field-group">
      <label class="field-label">${t('f_status')}</label>
      <div class="status-pills">
        ${STAGES.map(stage => `<button class="status-pill${stage===cstage?' active':''}" data-stage="${stage}" style="color:${scfg[stage].clr};background:rgba(0,0,0,.15)">${scfg[stage].label}</button>`).join('')}
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">${t('f_owner')}</label>
      <select class="field-select" id="f-owner">
        ${state.profiles.map(p => `<option value="${p.id}"${(company?.assigned_to||state.user.id)===p.id?' selected':''}>${esc(p.full_name)}</option>`).join('')}
      </select>
    </div>
    <div class="field-group">
      <label class="field-label">${t('f_followup')}</label>
      <p class="field-hint">${t('f_followup_hint')}</p>
      <input class="field-input" id="f-followup" placeholder="YYYY-MM-DD" value="${esc(company?.followup_at ? company.followup_at.slice(0,10) : '')}" />
    </div>
    <div class="field-group">
      <label class="field-label">${t('f_notes')}</label>
      <textarea class="field-textarea" id="f-notes">${esc(company?.notes||'')}</textarea>
    </div>
    ${company ? `
    <div class="field-group">
      <div class="correspondence-header">
        <label class="field-label">${t('correspondence_label')}</label>
        <button class="btn-ghost" id="btn-compose-toggle" type="button" style="width:auto;padding:5px 12px;font-size:12px;">${t('compose_btn')}</button>
      </div>
      <div id="company-emails-list" class="company-emails-list"></div>
      <div id="compose-box" class="compose-box hidden">
        <select class="field-select" id="compose-template">
          <option value="">${t('template_use')}</option>
          ${state.templates.map(tpl => `<option value="${tpl.id}">${esc(tpl.category)} — ${esc(tpl.name)}</option>`).join('')}
        </select>
        <input class="field-input" id="compose-to" placeholder="${t('compose_to')}" value="${company.contact_type === 'email' ? esc(company.contact_value || '') : ''}" />
        <input class="field-input" id="compose-subject" placeholder="${t('compose_subject')}" />
        <textarea class="field-textarea" id="compose-body" placeholder="${t('compose_body')}"></textarea>
        <div class="reply-actions">
          <button class="btn-primary" id="compose-send-btn" type="button" style="width:auto;padding:9px 16px;">${t('compose_send')}</button>
        </div>
      </div>
    </div>` : ''}
    <div class="modal-footer">
      <button class="btn-primary" id="btn-modal-save">${t('save')}</button>
      <button class="btn-ghost"   id="btn-modal-cancel">${t('cancel')}</button>
    </div>
  `

  // Contact type pills
  let selectedCtype = ctype
  qs('#ctype-pills').addEventListener('click', e => {
    const b = e.target.closest('.pill-btn')
    if (!b) return
    selectedCtype = b.dataset.ct
    qsa('#ctype-pills .pill-btn').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
  })

  // Stage pills
  let selectedStage = cstage
  qs('.status-pills').addEventListener('click', e => {
    const b = e.target.closest('.status-pill')
    if (!b) return
    selectedStage = b.dataset.stage
    qsa('.status-pill').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
  })

  qs('#btn-modal-save').addEventListener('click', async () => {
    const name = qs('#f-name').value.trim()
    if (!name) { qs('#f-name').focus(); return }
    const fu = qs('#f-followup').value.trim()
    if (fu && !/^\d{4}-\d{2}-\d{2}$/.test(fu)) {
      qs('#f-followup').focus(); return
    }
    const ok = await saveCompany({
      name, stage: selectedStage,
      industry:      qs('#f-industry').value,
      contact_type:  selectedCtype,
      contact_value: qs('#f-cval').value.trim(),
      service:       qs('#f-service').value,
      assigned_to:   qs('#f-owner').value,
      followup_at:   fu || null,
      notes:         qs('#f-notes').value.trim(),
    }, state.editingId)
    if (ok) hideModal()
  })

  qs('#btn-modal-cancel').addEventListener('click', hideModal)
  overlay.classList.remove('hidden')
  qs('#f-name').focus()

  if (isViewer()) {
    qsa('#modal-body input, #modal-body select, #modal-body textarea, #modal-body button.pill-btn, #modal-body button.status-pill')
      .forEach(elm => { elm.disabled = true })
    qs('#btn-modal-save').classList.add('hidden')
  }

  if (company) {
    loadCompanyEmails(company.id)
    loadTemplates()

    if (isViewer()) {
      qs('#btn-compose-toggle').classList.add('hidden')
      return
    }

    qs('#btn-compose-toggle').addEventListener('click', () => {
      qs('#compose-box').classList.toggle('hidden')
    })

    qs('#compose-template').addEventListener('change', e => {
      const tpl = state.templates.find(x => String(x.id) === e.target.value)
      if (!tpl) return
      qs('#compose-subject').value = tpl.subject || ''
      qs('#compose-body').value = tpl.body || ''
    })

    qs('#compose-send-btn').addEventListener('click', async () => {
      const to = qs('#compose-to').value.trim()
      const subject = qs('#compose-subject').value.trim()
      const bodyText = qs('#compose-body').value.trim()
      if (!to || !bodyText) return
      const btn = qs('#compose-send-btn')
      btn.disabled = true
      btn.textContent = t('reply_sending')
      const result = await sendEmailViaEdge({ to, subject, bodyText, companyId: company.id })
      btn.disabled = false
      btn.textContent = t('compose_send')
      if (!result.ok) { sbar(t('send_failed') + result.message); return }
      showToast(t('compose_sent'))
      qs('#compose-to').value = ''
      qs('#compose-subject').value = ''
      qs('#compose-body').value = ''
      qs('#compose-box').classList.add('hidden')
      loadCompanyEmails(company.id)
    })
  }
}

function hideModal() {
  qs('#modal-overlay').classList.add('hidden')
  state.editingId = null
}

qs('#modal-close').addEventListener('click', hideModal)
qs('#modal-overlay').addEventListener('click', e => { if (e.target === qs('#modal-overlay')) hideModal() })

// ── View Overlay (read-only, opened by a single click on a row) ──────────────
function showViewOverlay(company) {
  hideModal()
  const scfg = state.lang === 'ar' ? STAGE_AR : STAGE_EN
  const s = scfg[company.stage] || scfg.not_contacted
  const assignedProfile = state.profileMap[company.assigned_to]
  const modProfile      = state.profileMap[company.modified_by]
  const contact = [company.contact_type, company.contact_value].filter(Boolean).join('  ')
  const fuDate  = company.followup_at ? company.followup_at.slice(0, 10) : ''

  qs('#view-title').textContent = company.name

  qs('#view-body').innerHTML = `
    <div class="view-row"><span class="view-label">${t('f_industry')}</span><span class="view-value">${esc(company.industry) || '—'}</span></div>
    <div class="view-row"><span class="view-label">${t('f_contact_type')}</span><span class="view-value">${esc(contact) || '—'}</span></div>
    <div class="view-row"><span class="view-label">${t('f_service')}</span><span class="view-value">${esc(company.service) || '—'}</span></div>
    <div class="view-row"><span class="view-label">${t('f_status')}</span><span class="view-value"><span class="status-badge ${s.cls}">${s.label}</span></span></div>
    <div class="view-row"><span class="view-label">${t('f_owner')}</span><span class="view-value">${esc(assignedProfile?.full_name) || '—'}</span></div>
    <div class="view-row"><span class="view-label">${t('f_followup')}</span><span class="view-value">${esc(fuDate) || '—'}</span></div>
    <div class="view-row view-notes"><span class="view-label">${t('f_notes')}</span><div class="view-value-block">${esc(company.notes) || '—'}</div></div>
    <div class="view-row"><span class="view-label">${t('col_by')}</span><span class="view-value">${esc(modProfile?.full_name) || '—'}</span></div>
    <div class="view-row"><span class="view-label">${t('col_updated')}</span><span class="view-value">${esc((company.updated_at||'').slice(0,16).replace('T',' '))}</span></div>
  `

  qs('#view-overlay').classList.remove('hidden')
}

function hideViewOverlay() {
  qs('#view-overlay').classList.add('hidden')
}

qs('#view-close').addEventListener('click', hideViewOverlay)
qs('#view-overlay').addEventListener('click', e => { if (e.target === qs('#view-overlay')) hideViewOverlay() })
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideViewOverlay() })

// ── Delete ────────────────────────────────────────────────────────────────────
async function handleDelete() {
  if (isViewer()) return
  if (!state.selected) { sbar(t('no_selection')); return }
  if (!confirm(t('confirm_delete'))) return
  await removeCompany(state.selected)
  state.selected = null
}

// ── Context Menu ──────────────────────────────────────────────────────────────
function showCtxMenu(e, company) {
  if (isViewer()) return
  const menu  = qs('#ctx-menu')
  const scfg  = state.lang === 'ar' ? STAGE_AR : STAGE_EN
  menu.innerHTML = ''

  const subLabel = el('div','ctx-sub-label', t('ctx_status'))
  menu.appendChild(subLabel)
  STAGES.forEach(stage => {
    const s = scfg[stage]
    const item = el('div','ctx-item')
    item.style.color = s.clr
    item.textContent = s.label
    item.addEventListener('click', () => { quickStage(company, stage); hideCtxMenu() })
    menu.appendChild(item)
  })

  if (company.contact_type && company.contact_type.includes('📞')) {
    menu.appendChild(el('div','ctx-divider'))
    const wa = el('div','ctx-item', `📱 ${t('ctx_wa')}`)
    wa.addEventListener('click', () => { openWhatsApp(company.contact_value); hideCtxMenu() })
    menu.appendChild(wa)
  }

  menu.appendChild(el('div','ctx-divider'))
  const editItem = el('div','ctx-item', `✏ ${t('edit')}`)
  editItem.addEventListener('click', () => { showModal(company); hideCtxMenu() })
  menu.appendChild(editItem)
  const delItem = el('div','ctx-item danger', `✕ ${t('delete')}`)
  delItem.addEventListener('click', () => { hideCtxMenu(); handleDelete() })
  menu.appendChild(delItem)

  const x = Math.min(e.clientX, window.innerWidth  - 200)
  const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 20)
  menu.style.left = x + 'px'
  menu.style.top  = y + 'px'
  menu.classList.remove('hidden')
}

function hideCtxMenu() { qs('#ctx-menu').classList.add('hidden') }
document.addEventListener('click',     () => hideCtxMenu())
document.addEventListener('keydown',   e => { if (e.key === 'Escape') hideCtxMenu() })

async function quickStage(company, stage) {
  await saveCompany({ stage }, company.id)
}

function openWhatsApp(phone) {
  const digits = phone.replace(/\D/g,'')
  const num = digits.startsWith('0') ? '963' + digits.slice(1) : digits
  if (num) window.open(`https://wa.me/${num}`)
}

// ── Settings ──────────────────────────────────────────────────────────────────
function showSettings() {
  qs('#settings-overlay').classList.remove('hidden')
  qs('#s-new-password').value     = ''
  qs('#s-confirm-password').value = ''
  qs('#settings-error').classList.add('hidden')
}

qs('#settings-close').addEventListener('click', () => qs('#settings-overlay').classList.add('hidden'))
qs('#settings-overlay').addEventListener('click', e => {
  if (e.target === qs('#settings-overlay')) qs('#settings-overlay').classList.add('hidden')
})

qs('#btn-save-password').addEventListener('click', async () => {
  const p1 = qs('#s-new-password').value
  const p2 = qs('#s-confirm-password').value
  const errEl = qs('#settings-error')

  if (p1.length < 8) { errEl.textContent = t('pass_too_short'); errEl.classList.remove('hidden'); return }
  if (p1 !== p2)     { errEl.textContent = t('pass_no_match');  errEl.classList.remove('hidden'); return }

  const { error } = await sb.auth.updateUser({ password: p1 })
  if (error) { errEl.textContent = error.message; errEl.classList.remove('hidden'); return }
  errEl.classList.add('hidden')
  qs('#settings-overlay').classList.add('hidden')
  sbar(t('saved'))
})

qs('#btn-logout').addEventListener('click', () => {
  qs('#settings-overlay').classList.add('hidden')
  logout()
})

// ── Lang ──────────────────────────────────────────────────────────────────────
function toggleLang() {
  state.lang = state.lang === 'en' ? 'ar' : 'en'
  localStorage.setItem('crm_lang', state.lang)
  applyLang()
  buildSidebar()
  buildTopbar()
  buildTableHead()
  render()
}

function applyLang() {
  const isAr = state.lang === 'ar'
  document.documentElement.lang = state.lang
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr'

  qsa('[data-i18n]').forEach(node => {
    const key = node.dataset.i18n
    if (T[state.lang][key]) node.textContent = T[state.lang][key]
  })
  qsa('[data-i18n-placeholder]').forEach(node => {
    const key = node.dataset.i18nPlaceholder
    if (T[state.lang][key]) node.placeholder = T[state.lang][key]
  })
  const ltBtn = qs('#lang-toggle-login')
  if (ltBtn) ltBtn.textContent = t('lang_switch')
  const lBtn = qs('#btn-lang')
  if (lBtn) lBtn.textContent = t('lang_switch')
}

qs('#lang-toggle-login').addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'ar' : 'en'
  localStorage.setItem('crm_lang', state.lang)
  applyLang()
})

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV() {
  const rows = [
    ['ID','Name','Industry','Contact Type','Contact Value','Service','Stage',
     'Assigned','Follow-up','Notes','Modified By','Created','Updated'],
    ...state.companies.map(c => [
      c.id, c.name, c.industry, c.contact_type, c.contact_value, c.service,
      c.stage, state.profileMap[c.assigned_to]?.full_name || '',
      c.followup_at ? c.followup_at.slice(0,10) : '',
      c.notes, state.profileMap[c.modified_by]?.full_name || '',
      c.created_at, c.updated_at,
    ])
  ]
  const csv = rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv)
  a.download = 'rabet_companies.csv'
  a.click()
}

// ── Start ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init)
