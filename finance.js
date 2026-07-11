// Finance — standalone page (opens in its own tab from the CRM's sidebar
// nav). Shares the same Supabase auth session via localStorage, so a
// logged-in user doesn't need to log in again here. Gated to owner/
// accountant: anyone else (or anyone with no session) is redirected back to
// index.html before any finance UI is rendered — this page has a real URL,
// unlike the rest of the CRM, so this redirect is the actual enforcement
// layer on top of RLS, not just a UI nicety.

const INCOME_OPTIONS = [
  { value: 'Monthly Sub',  labelKey: 'finance_income_monthly_sub' },
  { value: 'Deals',        labelKey: 'finance_income_deals' },
  { value: 'Photoshoots',  labelKey: 'finance_income_photoshoots' },
]

const T = {
en: {
  finance_title: '$ Finance',
  back_to_crm: '← Back to CRM',
  lang_switch: 'العربية',
  loading: 'Loading…',
  finance_type_expense: 'Expense',
  finance_type_salary: 'Salary',
  finance_type_income: 'Income',
  finance_income_monthly_sub: 'Monthly Sub',
  finance_income_deals: 'Deals',
  finance_income_photoshoots: 'Photoshoots',
  finance_filter_all_types: 'All Types',
  finance_from: 'From',
  finance_to: 'To',
  finance_add: '+ Add Entry',
  finance_total_income: 'Total Income',
  finance_total_expenses: 'Total Expenses',
  finance_total_salaries: 'Total Salaries',
  finance_total_net: 'Net',
  finance_empty: 'No entries match your filters.',
  finance_delete_confirm: 'Delete this entry? This cannot be undone.',
  f_entry_type: 'Type', f_payee: 'Payee', f_category: 'Category',
  f_amount: 'Amount', f_currency: 'Currency', f_entry_date: 'Date', f_notes: 'Notes',
  col_date: 'Date', col_type: 'Type', col_payee: 'Payee',
  col_category: 'Category', col_amount: 'Amount', col_actions: '',
  save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete',
},
ar: {
  finance_title: '$ المالية',
  back_to_crm: '→ العودة إلى CRM',
  lang_switch: 'English',
  loading: 'جارٍ التحميل…',
  finance_type_expense: 'مصروف',
  finance_type_salary: 'راتب',
  finance_type_income: 'دخل',
  finance_income_monthly_sub: 'اشتراك شهري',
  finance_income_deals: 'صفقات',
  finance_income_photoshoots: 'جلسات تصوير',
  finance_filter_all_types: 'كل الأنواع',
  finance_from: 'من',
  finance_to: 'إلى',
  finance_add: '+ إضافة قيد',
  finance_total_income: 'إجمالي الدخل',
  finance_total_expenses: 'إجمالي المصاريف',
  finance_total_salaries: 'إجمالي الرواتب',
  finance_total_net: 'الصافي',
  finance_empty: 'لا توجد قيود تطابق الفلتر.',
  finance_delete_confirm: 'حذف هذا القيد؟ لا يمكن التراجع.',
  f_entry_type: 'النوع', f_payee: 'المستفيد', f_category: 'الفئة',
  f_amount: 'المبلغ', f_currency: 'العملة', f_entry_date: 'التاريخ', f_notes: 'ملاحظات',
  col_date: 'التاريخ', col_type: 'النوع', col_payee: 'المستفيد',
  col_category: 'الفئة', col_amount: 'المبلغ', col_actions: '',
  save: 'حفظ', cancel: 'إلغاء', edit: 'تعديل', delete: 'حذف',
},
}

let sb
let lang = localStorage.getItem('crm_lang') || 'en'
let entries = []
let employees = []   // full_name list from profiles, for the salary payee preset
let filters = { type: '', from: '', to: '' }

const t   = key => T[lang][key] || key
const qs  = sel => document.querySelector(sel)
const qsa = sel => document.querySelectorAll(sel)
const today = () => new Date().toISOString().slice(0, 10)

function esc(str) {
  if (!str && str !== 0) return ''
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function typeLabel(entryType) {
  if (entryType === 'income') return t('finance_type_income')
  if (entryType === 'salary') return t('finance_type_salary')
  return t('finance_type_expense')
}

function applyLang() {
  const isAr = lang === 'ar'
  document.documentElement.lang = lang
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr'
  qs('#fp-title').textContent   = t('finance_title')
  qs('#btn-fp-back').textContent = t('back_to_crm')
  qs('#btn-fp-lang').textContent = t('lang_switch')
}

async function init() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  applyLang()
  qs('#btn-fp-lang').addEventListener('click', () => {
    lang = lang === 'en' ? 'ar' : 'en'
    localStorage.setItem('crm_lang', lang)
    applyLang()
    if (!qs('#finance-body').classList.contains('hidden')) renderFinance()
  })

  qs('#fp-status').textContent = t('loading')

  const { data: { session } } = await sb.auth.getSession()
  if (!session) { window.location.href = 'index.html'; return }

  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single()
  if (error || !profile || (profile.role !== 'owner' && profile.role !== 'accountant')) {
    window.location.href = 'index.html'
    return
  }

  qs('#fp-status').classList.add('hidden')
  qs('#finance-body').classList.remove('hidden')
  await Promise.all([loadEntries(), loadEmployees()])
  renderFinance()
}

async function loadEntries() {
  const { data, error } = await sb.from('finance_entries').select('*').order('entry_date', { ascending: false })
  if (error) { qs('#fp-status').classList.remove('hidden'); qs('#fp-status').textContent = 'Error: ' + error.message; return }
  entries = data || []
}

async function loadEmployees() {
  const { data, error } = await sb.from('profiles').select('full_name').neq('role', 'viewer').order('full_name')
  if (error) return
  employees = (data || []).map(p => p.full_name).filter(Boolean)
}

function filteredEntries() {
  return entries.filter(e => {
    if (filters.type && e.entry_type !== filters.type) return false
    if (filters.from && e.entry_date < filters.from) return false
    if (filters.to   && e.entry_date > filters.to)   return false
    return true
  })
}

// Payee behaves differently per entry_type:
//  - salary:  fixed dropdown of team members (from profiles)
//  - income:  fixed dropdown — Monthly Sub / Deals / Photoshoots
//  - expense: free text with a datalist of previously-used expense payees,
//             so typing a new one effectively "saves" it as a future preset
//             (it just shows up next time since it's now in the data)
function payeeFieldHtml(entryType, currentValue) {
  if (entryType === 'salary') {
    const options = employees.slice()
    if (currentValue && !options.includes(currentValue)) options.unshift(currentValue)
    return `<select class="field-select" id="fin-payee">
      ${options.map(name => `<option value="${esc(name)}"${name === currentValue ? ' selected' : ''}>${esc(name)}</option>`).join('')}
    </select>`
  }
  if (entryType === 'income') {
    const options = INCOME_OPTIONS.slice()
    const known = options.some(o => o.value === currentValue)
    return `<select class="field-select" id="fin-payee">
      ${!known && currentValue ? `<option value="${esc(currentValue)}" selected>${esc(currentValue)}</option>` : ''}
      ${options.map(o => `<option value="${esc(o.value)}"${o.value === currentValue ? ' selected' : ''}>${esc(t(o.labelKey))}</option>`).join('')}
    </select>`
  }
  const presets = [...new Set(entries.filter(e => e.entry_type === 'expense').map(e => e.payee).filter(Boolean))].sort()
  return `<div class="combo-wrap">
    <input class="field-input" id="fin-payee" autocomplete="off" value="${esc(currentValue || '')}" />
    <div class="combo-list hidden" id="fin-payee-combo-list">
      ${presets.map(p => `<div class="combo-item" data-value="${esc(p)}">${esc(p)}</div>`).join('')}
    </div>
  </div>`
}

// Click/focus the expense payee field to see the full preset list (not
// filtered until you start typing) — a plain <datalist> doesn't reliably do
// this across browsers, so it's a small hand-rolled combo box instead.
function wirePayeeCombo() {
  const input = qs('#fin-payee')
  const list  = qs('#fin-payee-combo-list')
  if (!input || !list) return

  const showList = () => list.classList.remove('hidden')
  const hideList = () => list.classList.add('hidden')

  input.addEventListener('focus', showList)
  input.addEventListener('click', showList)
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase()
    qsa('#fin-payee-combo-list .combo-item').forEach(item => {
      item.classList.toggle('hidden', !!q && !item.dataset.value.toLowerCase().includes(q))
    })
    showList()
  })
  input.addEventListener('blur', () => setTimeout(hideList, 150))

  qsa('#fin-payee-combo-list .combo-item').forEach(item => {
    item.addEventListener('mousedown', e => {
      e.preventDefault() // keep the input focused so 'blur' doesn't fire before this click registers
      input.value = item.dataset.value
      hideList()
    })
  })
}

function setPayeeField(entryType, currentValue) {
  qs('#fin-payee-wrap').innerHTML = payeeFieldHtml(entryType, currentValue)
  wirePayeeCombo()
}

function renderFinance(editingId) {
  const body = qs('#finance-body')
  const editing = editingId !== undefined
    ? entries.find(x => x.id === editingId) || {}
    : null
  const data = filteredEntries()

  const totalIncome    = data.filter(e => e.entry_type === 'income').reduce((s, e) => s + Number(e.amount), 0)
  const totalExpenses  = data.filter(e => e.entry_type === 'expense').reduce((s, e) => s + Number(e.amount), 0)
  const totalSalaries  = data.filter(e => e.entry_type === 'salary').reduce((s, e) => s + Number(e.amount), 0)
  const net = totalIncome - totalExpenses - totalSalaries

  const rowsHtml = data.length
    ? data.map(e => `
      <tr data-id="${e.id}">
        <td>${esc(e.entry_date)}</td>
        <td>${typeLabel(e.entry_type)}</td>
        <td title="${esc(e.payee)}">${esc(e.payee)}</td>
        <td>${esc(e.category || '')}</td>
        <td>${Number(e.amount).toFixed(2)} ${esc(e.currency)}</td>
        <td class="finance-row-actions">
          <button data-act="edit">${t('edit')}</button>
          <button data-act="delete">${t('delete')}</button>
        </td>
      </tr>
    `).join('')
    : `<tr><td colspan="6" class="field-hint">${t('finance_empty')}</td></tr>`

  const formType = editing?.entry_type || 'expense'

  body.innerHTML = `
    <div class="finance-totals">
      <div class="finance-total-tile">
        <div class="finance-total-label">${t('finance_total_income')}</div>
        <div class="finance-total-value" style="color:#34D399">${totalIncome.toFixed(2)}</div>
      </div>
      <div class="finance-total-tile">
        <div class="finance-total-label">${t('finance_total_expenses')}</div>
        <div class="finance-total-value" style="color:#F43F5E">${totalExpenses.toFixed(2)}</div>
      </div>
      <div class="finance-total-tile">
        <div class="finance-total-label">${t('finance_total_salaries')}</div>
        <div class="finance-total-value" style="color:#F59E0B">${totalSalaries.toFixed(2)}</div>
      </div>
      <div class="finance-total-tile">
        <div class="finance-total-label">${t('finance_total_net')}</div>
        <div class="finance-total-value" style="color:${net >= 0 ? '#34D399' : '#F43F5E'}">${net.toFixed(2)}</div>
      </div>
    </div>
    <div class="finance-filters">
      <select class="filter-select" id="fin-filter-type">
        <option value="">${t('finance_filter_all_types')}</option>
        <option value="income">${t('finance_type_income')}</option>
        <option value="expense">${t('finance_type_expense')}</option>
        <option value="salary">${t('finance_type_salary')}</option>
      </select>
      <span class="field-hint" style="margin:0;">${t('finance_from')}</span>
      <input type="date" class="field-input" id="fin-filter-from" />
      <span class="field-hint" style="margin:0;">${t('finance_to')}</span>
      <input type="date" class="field-input" id="fin-filter-to" />
      <button class="btn-ghost" id="btn-finance-new" style="width:auto;padding:8px 14px;margin-left:auto;">${t('finance_add')}</button>
    </div>
    <div class="finance-table-wrap">
      <table class="finance-table">
        <thead><tr>
          <th>${t('col_date')}</th><th>${t('col_type')}</th><th>${t('col_payee')}</th>
          <th>${t('col_category')}</th><th>${t('col_amount')}</th><th>${t('col_actions')}</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <div id="finance-form" class="field-group hidden">
      <label class="field-label">${t('f_entry_type')}</label>
      <select class="field-select" id="fin-type">
        <option value="expense"${formType === 'expense' ? ' selected' : ''}>${t('finance_type_expense')}</option>
        <option value="salary"${formType === 'salary' ? ' selected' : ''}>${t('finance_type_salary')}</option>
        <option value="income"${formType === 'income' ? ' selected' : ''}>${t('finance_type_income')}</option>
      </select>
      <label class="field-label">${t('f_payee')}</label>
      <div id="fin-payee-wrap"></div>
      <label class="field-label">${t('f_category')}</label>
      <input class="field-input" id="fin-category" value="${esc(editing?.category || '')}" />
      <label class="field-label">${t('f_amount')}</label>
      <input class="field-input" id="fin-amount" type="number" step="0.01" value="${esc(editing?.amount ?? '')}" />
      <label class="field-label">${t('f_currency')}</label>
      <input class="field-input" id="fin-currency" value="${esc(editing?.currency || 'USD')}" />
      <label class="field-label">${t('f_entry_date')}</label>
      <input class="field-input" id="fin-date" type="date" value="${esc(editing?.entry_date ? editing.entry_date.slice(0,10) : today())}" />
      <label class="field-label">${t('f_notes')}</label>
      <textarea class="field-textarea" id="fin-notes">${esc(editing?.notes || '')}</textarea>
      <div class="modal-footer">
        <button class="btn-primary" id="btn-finance-save">${t('save')}</button>
        <button class="btn-ghost" id="btn-finance-cancel">${t('cancel')}</button>
      </div>
    </div>
  `

  qs('#fin-filter-type').value = filters.type
  qs('#fin-filter-from').value = filters.from
  qs('#fin-filter-to').value   = filters.to
  qs('#fin-filter-type').onchange = e => { filters.type = e.target.value; renderFinance() }
  qs('#fin-filter-from').onchange = e => { filters.from = e.target.value; renderFinance() }
  qs('#fin-filter-to').onchange   = e => { filters.to   = e.target.value; renderFinance() }

  const form = qs('#finance-form')
  if (editing !== null) form.classList.remove('hidden')

  setPayeeField(formType, editing?.payee)
  qs('#fin-type').addEventListener('change', e => setPayeeField(e.target.value, null))

  qs('#btn-finance-new').addEventListener('click', () => renderFinance(null))
  qs('#btn-finance-cancel')?.addEventListener('click', () => renderFinance())

  qs('#btn-finance-save')?.addEventListener('click', async () => {
    const payload = {
      entry_type: qs('#fin-type').value,
      payee:      qs('#fin-payee').value.trim(),
      category:   qs('#fin-category').value.trim() || null,
      amount:     parseFloat(qs('#fin-amount').value),
      currency:   qs('#fin-currency').value.trim() || 'USD',
      entry_date: qs('#fin-date').value,
      notes:      qs('#fin-notes').value.trim() || null,
    }
    if (!payload.payee || !payload.entry_date || Number.isNaN(payload.amount)) return
    const id = editing?.id
    const { error } = id
      ? await sb.from('finance_entries').update(payload).eq('id', id)
      : await sb.from('finance_entries').insert(payload)
    if (error) { alert('Error: ' + error.message); return }
    await loadEntries()
    renderFinance()
  })

  qsa('.finance-table tbody tr[data-id]').forEach(row => {
    const id = row.dataset.id
    row.querySelector('[data-act="edit"]').addEventListener('click', () => renderFinance(id))
    row.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      if (!confirm(t('finance_delete_confirm'))) return
      const { error } = await sb.from('finance_entries').delete().eq('id', id)
      if (error) { alert('Error: ' + error.message); return }
      await loadEntries()
      renderFinance()
    })
  })
}

document.addEventListener('DOMContentLoaded', init)
