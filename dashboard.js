// Dashboard — standalone page (opens in its own tab from the CRM's sidebar
// nav), owner-only. Shares the same Supabase auth session via localStorage.
// Two tabs:
//  - Overview: finance totals + breakdown by client, and a side-by-side hours
//    panel (manual attendance vs. auto-tracked CRM login sessions).
//  - Attendance: owner's manual sign-in/sign-out log (CRUD).
// Gated the same way finance.html is: this page has a real, guessable URL,
// so the redirect-if-not-owner check here is the actual enforcement layer on
// top of RLS, not just a UI nicety.

const T = {
en: {
  dashboard_title: '◆ Dashboard',
  back_to_crm: '← Back to CRM',
  lang_switch: 'العربية',
  loading: 'Loading…',
  tab_overview: 'Overview',
  tab_followups: 'Follow-ups',
  tab_attendance: 'Attendance',
  col_company: 'Company', col_assignee: 'Assigned To', col_next_action: 'Next Action', col_note: 'Note',
  followups_empty: 'Nothing overdue or due today. Nice.',
  followup_overdue: 'Overdue', followup_due_today: 'Due Today',
  range_from: 'From',
  range_to: 'To',
  section_finance: 'Finance',
  section_hours: 'Hours',
  total_income: 'Total Income',
  total_expenses: 'Total Expenses',
  total_salaries: 'Total Salaries',
  total_net: 'Net',
  client_breakdown_title: 'By Client',
  col_client: 'Client', col_income: 'Income', col_expense: 'Expense', col_net: 'Net',
  no_client: 'No Client',
  db_empty: 'No entries for this period.',
  manual_hours_title: 'Manual Attendance Hours',
  login_hours_title: 'CRM Login Hours',
  attendance_add: '+ Add Entry',
  f_person: 'Person', f_sign_in: 'Sign In', f_sign_out: 'Sign Out (leave blank if still in)',
  col_person: 'Person', col_sign_in: 'Sign In', col_sign_out: 'Sign Out',
  col_duration: 'Duration', col_actions: '',
  ongoing: 'Ongoing…',
  attendance_empty: 'No attendance entries yet.',
  attendance_delete_confirm: 'Delete this attendance entry?',
  save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete',
},
ar: {
  dashboard_title: '◆ لوحة التحكم',
  back_to_crm: '→ العودة إلى CRM',
  lang_switch: 'English',
  loading: 'جارٍ التحميل…',
  tab_overview: 'نظرة عامة',
  tab_followups: 'المتابعات',
  tab_attendance: 'الحضور',
  col_company: 'الشركة', col_assignee: 'المسؤول', col_next_action: 'الإجراء التالي', col_note: 'ملاحظة',
  followups_empty: 'لا توجد متابعات متأخرة أو مستحقة اليوم.',
  followup_overdue: 'متأخرة', followup_due_today: 'مستحقة اليوم',
  range_from: 'من',
  range_to: 'إلى',
  section_finance: 'المالية',
  section_hours: 'ساعات العمل',
  total_income: 'إجمالي الدخل',
  total_expenses: 'إجمالي المصاريف',
  total_salaries: 'إجمالي الرواتب',
  total_net: 'الصافي',
  client_breakdown_title: 'حسب العميل',
  col_client: 'العميل', col_income: 'الدخل', col_expense: 'المصروف', col_net: 'الصافي',
  no_client: 'بدون عميل',
  db_empty: 'لا توجد قيود لهذه الفترة.',
  manual_hours_title: 'ساعات الحضور اليدوي',
  login_hours_title: 'ساعات تسجيل الدخول إلى CRM',
  attendance_add: '+ إضافة قيد',
  f_person: 'الشخص', f_sign_in: 'وقت الحضور', f_sign_out: 'وقت الانصراف (اتركه فارغاً إن كان ما زال حاضراً)',
  col_person: 'الشخص', col_sign_in: 'الحضور', col_sign_out: 'الانصراف',
  col_duration: 'المدة', col_actions: '',
  ongoing: 'مستمر…',
  attendance_empty: 'لا توجد قيود حضور بعد.',
  attendance_delete_confirm: 'حذف قيد الحضور هذا؟',
  save: 'حفظ', cancel: 'إلغاء', edit: 'تعديل', delete: 'حذف',
},
}

let sb
let lang = localStorage.getItem('crm_lang') || 'en'
let activeTab = 'overview'
let profiles  = []
let profileMap = {}
let companies = []
let entries    = []   // finance_entries, with embedded company name
let attendance = []
let sessions   = []
let filters = { ...monthRange() }

function monthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = d => d.toISOString().slice(0, 10)
  return { from: fmt(first), to: fmt(last) }
}

const t   = key => T[lang][key] || key
const qs  = sel => document.querySelector(sel)
const qsa = sel => document.querySelectorAll(sel)
const today = () => new Date().toISOString().slice(0, 10)

function esc(str) {
  if (!str && str !== 0) return ''
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function toLocalInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function applyLang() {
  const isAr = lang === 'ar'
  document.documentElement.lang = lang
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr'
  qs('#db-title').textContent    = t('dashboard_title')
  qs('#btn-db-back').textContent = t('back_to_crm')
  qs('#btn-db-lang').textContent = t('lang_switch')
  qs('#db-tab-overview').textContent   = t('tab_overview')
  qs('#db-tab-followups').textContent  = t('tab_followups')
  qs('#db-tab-attendance').textContent = t('tab_attendance')
}

async function init() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  applyLang()
  qs('#btn-db-lang').addEventListener('click', () => {
    lang = lang === 'en' ? 'ar' : 'en'
    localStorage.setItem('crm_lang', lang)
    applyLang()
    renderActiveTab()
  })
  qs('#db-tab-overview').addEventListener('click', () => switchTab('overview'))
  qs('#db-tab-followups').addEventListener('click', () => switchTab('followups'))
  qs('#db-tab-attendance').addEventListener('click', () => switchTab('attendance'))

  qs('#db-status').textContent = t('loading')

  const { data: { session } } = await sb.auth.getSession()
  if (!session) { window.location.href = 'index.html'; return }

  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single()
  if (error || !profile || profile.role !== 'owner') {
    window.location.href = 'index.html'
    return
  }

  qs('#db-status').classList.add('hidden')
  qs('#dashboard-body').classList.remove('hidden')

  await Promise.all([loadProfiles(), loadCompanies(), loadEntries(), loadAttendance(), loadSessions()])
  renderActiveTab()
}

async function loadProfiles() {
  const { data } = await sb.from('profiles').select('*').order('full_name')
  profiles = data || []
  profileMap = {}
  profiles.forEach(p => { profileMap[p.id] = p })
}

async function loadCompanies() {
  const { data } = await sb.from('companies')
    .select('id, name, stage, assigned_to, followup_at, next_action_note')
    .order('name')
  companies = data || []
}

async function loadEntries() {
  const { data, error } = await sb.from('finance_entries')
    .select('*, company:companies(name)')
    .order('entry_date', { ascending: false })
  if (error) { entries = []; return }
  entries = data || []
}

async function loadAttendance() {
  const { data, error } = await sb.from('attendance_entries').select('*').order('sign_in_at', { ascending: false })
  if (error) { attendance = []; return }
  attendance = data || []
}

async function loadSessions() {
  const { data, error } = await sb.from('login_sessions').select('*').order('login_at', { ascending: false })
  if (error) { sessions = []; return }
  sessions = data || []
}

function switchTab(tab) {
  activeTab = tab
  ;['overview','followups','attendance'].forEach(name => {
    qs(`#db-tab-${name}`).classList.toggle('active', name === tab)
    qs(`#db-${name}`).classList.toggle('hidden', name !== tab)
  })
  renderActiveTab()
}

function renderActiveTab() {
  if (activeTab === 'overview') renderOverview()
  else if (activeTab === 'followups') renderFollowups()
  else renderAttendanceTab()
}

// ── Follow-ups: overdue + due-today companies ───────────────────────────────
function renderFollowups() {
  const wrap = qs('#db-followups')
  const tod = today()

  const due = companies
    .filter(c => c.followup_at && c.stage !== 'closed_won' && c.stage !== 'dead')
    .map(c => ({ ...c, fuDate: c.followup_at.slice(0, 10) }))
    .filter(c => c.fuDate <= tod)
    .sort((a, b) => a.fuDate.localeCompare(b.fuDate))

  const rowsHtml = due.length ? due.map(c => `
    <tr>
      <td>${esc(c.name)}</td>
      <td style="color:${c.fuDate < tod ? '#F43F5E' : '#F59E0B'}">${c.fuDate < tod ? t('followup_overdue') : t('followup_due_today')} — ${esc(c.fuDate)}</td>
      <td>${esc(profileMap[c.assigned_to]?.full_name || '')}</td>
      <td>${esc(c.next_action_note || '')}</td>
    </tr>
  `).join('') : `<tr><td colspan="4" class="field-hint">${t('followups_empty')}</td></tr>`

  wrap.innerHTML = `
    <div class="db-client-table-wrap">
      <table class="db-client-table">
        <thead><tr>
          <th>${t('col_company')}</th><th>${t('col_next_action')}</th><th>${t('col_assignee')}</th><th>${t('col_note')}</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `
}

// ── Overview: finance totals + client breakdown + hours panel ───────────────
function inRange(dateStr) {
  return dateStr && dateStr >= filters.from && dateStr <= filters.to
}

function renderOverview() {
  const wrap = qs('#db-overview')

  const periodEntries = entries.filter(e => inRange(e.entry_date))
  const totalIncome   = periodEntries.filter(e => e.entry_type === 'income').reduce((s, e) => s + Number(e.amount), 0)
  const totalExpenses = periodEntries.filter(e => e.entry_type === 'expense').reduce((s, e) => s + Number(e.amount), 0)
  const totalSalaries = periodEntries.filter(e => e.entry_type === 'salary').reduce((s, e) => s + Number(e.amount), 0)
  const net = totalIncome - totalExpenses - totalSalaries

  // Breakdown by client — group by company_id, "No Client" bucket for the rest.
  const byClient = {}
  periodEntries.forEach(e => {
    const key = e.company_id || '__none__'
    if (!byClient[key]) byClient[key] = { name: e.company?.name || t('no_client'), income: 0, spend: 0 }
    if (e.entry_type === 'income') byClient[key].income += Number(e.amount)
    else byClient[key].spend += Number(e.amount)
  })
  const clientRows = Object.entries(byClient)
    .map(([key, v]) => ({ key, ...v, net: v.income - v.spend }))
    .sort((a, b) => (a.key === '__none__') - (b.key === '__none__') || b.net - a.net)

  const clientRowsHtml = clientRows.length
    ? clientRows.map(c => `
      <tr>
        <td>${esc(c.name)}</td>
        <td>${c.income.toFixed(2)}</td>
        <td>${c.spend.toFixed(2)}</td>
        <td style="color:${c.net >= 0 ? '#34D399' : '#F43F5E'}">${c.net.toFixed(2)}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="4" class="field-hint">${t('db_empty')}</td></tr>`

  // Hours panel
  const manualMs = {}
  attendance.forEach(a => {
    if (!a.sign_out_at) return
    if (!inRange((a.sign_in_at || '').slice(0, 10))) return
    const ms = new Date(a.sign_out_at) - new Date(a.sign_in_at)
    if (ms > 0) manualMs[a.profile_id] = (manualMs[a.profile_id] || 0) + ms
  })

  const loginMs = {}
  sessions.forEach(s => {
    if (!inRange((s.login_at || '').slice(0, 10))) return
    const ms = new Date(s.last_heartbeat_at) - new Date(s.login_at)
    if (ms > 0) loginMs[s.user_id] = (loginMs[s.user_id] || 0) + ms
  })

  const hoursRows = (msMap) => profiles
    .map(p => ({ name: p.full_name, hours: (msMap[p.id] || 0) / 3600000 }))
    .sort((a, b) => b.hours - a.hours)
    .map(r => `<div class="db-hours-row"><span class="db-hours-name">${esc(r.name)}</span><span class="db-hours-val">${r.hours.toFixed(1)}h</span></div>`)
    .join('')

  wrap.innerHTML = `
    <div class="db-range">
      <span class="field-hint" style="margin:0;">${t('range_from')}</span>
      <input type="date" class="field-input" id="db-range-from" value="${filters.from}" />
      <span class="field-hint" style="margin:0;">${t('range_to')}</span>
      <input type="date" class="field-input" id="db-range-to" value="${filters.to}" />
    </div>

    <div class="db-section-title">${t('section_finance')}</div>
    <div class="finance-totals">
      <div class="finance-total-tile">
        <div class="finance-total-label">${t('total_income')}</div>
        <div class="finance-total-value" style="color:#34D399">${totalIncome.toFixed(2)}</div>
      </div>
      <div class="finance-total-tile">
        <div class="finance-total-label">${t('total_expenses')}</div>
        <div class="finance-total-value" style="color:#F43F5E">${totalExpenses.toFixed(2)}</div>
      </div>
      <div class="finance-total-tile">
        <div class="finance-total-label">${t('total_salaries')}</div>
        <div class="finance-total-value" style="color:#F59E0B">${totalSalaries.toFixed(2)}</div>
      </div>
      <div class="finance-total-tile">
        <div class="finance-total-label">${t('total_net')}</div>
        <div class="finance-total-value" style="color:${net >= 0 ? '#34D399' : '#F43F5E'}">${net.toFixed(2)}</div>
      </div>
    </div>

    <div class="db-section-title">${t('client_breakdown_title')}</div>
    <div class="db-client-table-wrap">
      <table class="db-client-table">
        <thead><tr>
          <th>${t('col_client')}</th><th>${t('col_income')}</th><th>${t('col_expense')}</th><th>${t('col_net')}</th>
        </tr></thead>
        <tbody>${clientRowsHtml}</tbody>
      </table>
    </div>

    <div class="db-section-title">${t('section_hours')}</div>
    <div class="db-hours-grid">
      <div class="db-hours-panel">
        <div class="db-hours-panel-title">${t('manual_hours_title')}</div>
        ${hoursRows(manualMs) || `<div class="field-hint">—</div>`}
      </div>
      <div class="db-hours-panel">
        <div class="db-hours-panel-title">${t('login_hours_title')}</div>
        ${hoursRows(loginMs) || `<div class="field-hint">—</div>`}
      </div>
    </div>
  `

  qs('#db-range-from').onchange = e => { filters.from = e.target.value; renderOverview() }
  qs('#db-range-to').onchange   = e => { filters.to   = e.target.value; renderOverview() }
}

// ── Attendance tab: owner's manual sign-in/sign-out CRUD ────────────────────
function renderAttendanceTab(editingId) {
  const wrap = qs('#db-attendance')
  const editing = editingId !== undefined
    ? attendance.find(x => x.id === editingId) || {}
    : null

  const pickable = profiles.filter(p => p.role !== 'viewer')

  const rowsHtml = attendance.length
    ? attendance.map(a => {
      const person = profileMap[a.profile_id]?.full_name || '—'
      const duration = a.sign_out_at
        ? (((new Date(a.sign_out_at) - new Date(a.sign_in_at)) / 3600000).toFixed(2) + 'h')
        : t('ongoing')
      return `
      <tr data-id="${a.id}">
        <td>${esc(person)}</td>
        <td>${esc((a.sign_in_at || '').slice(0, 16).replace('T', ' '))}</td>
        <td>${esc(a.sign_out_at ? a.sign_out_at.slice(0, 16).replace('T', ' ') : '—')}</td>
        <td>${esc(duration)}</td>
        <td class="db-attendance-row-actions">
          <button data-act="edit">${t('edit')}</button>
          <button data-act="delete">${t('delete')}</button>
        </td>
      </tr>`
    }).join('')
    : `<tr><td colspan="5" class="field-hint">${t('attendance_empty')}</td></tr>`

  wrap.innerHTML = `
    <div class="db-attendance-table-wrap">
      <table class="db-attendance-table">
        <thead><tr>
          <th>${t('col_person')}</th><th>${t('col_sign_in')}</th><th>${t('col_sign_out')}</th>
          <th>${t('col_duration')}</th><th>${t('col_actions')}</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <button class="btn-ghost" id="btn-attendance-new" style="width:auto;padding:8px 14px;">${t('attendance_add')}</button>
    <div id="attendance-form" class="field-group hidden" style="margin-top:16px;">
      <label class="field-label">${t('f_person')}</label>
      <select class="field-select" id="att-person">
        ${pickable.map(p => `<option value="${p.id}"${(editing?.profile_id) === p.id ? ' selected' : ''}>${esc(p.full_name)}</option>`).join('')}
      </select>
      <label class="field-label">${t('f_sign_in')}</label>
      <input class="field-input" id="att-sign-in" type="datetime-local" value="${toLocalInputValue(editing?.sign_in_at)}" />
      <label class="field-label">${t('f_sign_out')}</label>
      <input class="field-input" id="att-sign-out" type="datetime-local" value="${toLocalInputValue(editing?.sign_out_at)}" />
      <div class="modal-footer">
        <button class="btn-primary" id="btn-attendance-save">${t('save')}</button>
        <button class="btn-ghost" id="btn-attendance-cancel">${t('cancel')}</button>
      </div>
    </div>
  `

  const form = qs('#attendance-form')
  if (editing !== null) form.classList.remove('hidden')

  qs('#btn-attendance-new').addEventListener('click', () => renderAttendanceTab(null))
  qs('#btn-attendance-cancel')?.addEventListener('click', () => renderAttendanceTab())

  qs('#btn-attendance-save')?.addEventListener('click', async () => {
    const signIn = localInputToIso(qs('#att-sign-in').value)
    if (!signIn) return
    const payload = {
      profile_id:  qs('#att-person').value,
      sign_in_at:  signIn,
      sign_out_at: localInputToIso(qs('#att-sign-out').value),
    }
    const id = editing?.id
    const { error } = id
      ? await sb.from('attendance_entries').update(payload).eq('id', id)
      : await sb.from('attendance_entries').insert(payload)
    if (error) { alert('Error: ' + error.message); return }
    await loadAttendance()
    renderAttendanceTab()
  })

  qsa('.db-attendance-table tbody tr[data-id]').forEach(row => {
    const id = row.dataset.id
    row.querySelector('[data-act="edit"]').addEventListener('click', () => renderAttendanceTab(id))
    row.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      if (!confirm(t('attendance_delete_confirm'))) return
      const { error } = await sb.from('attendance_entries').delete().eq('id', id)
      if (error) { alert('Error: ' + error.message); return }
      await loadAttendance()
      renderAttendanceTab()
    })
  })
}

document.addEventListener('DOMContentLoaded', init)
