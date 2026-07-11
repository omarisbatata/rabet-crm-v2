// IT admin page — standalone, gated to role in ('it','owner'), same pattern
// as finance.html/dashboard.html: this page has a real URL, so the redirect
// check in init() is the actual enforcement layer on top of RLS, not just a
// UI nicety. Shares the Supabase auth session via localStorage.

const T = {
en: {
  it_title: '◆ IT',
  back_to_crm: '← Back to CRM',
  lang_switch: 'العربية',
  loading: 'Loading…',
  tab_assets: 'Assets', tab_equipment: 'Equipment', tab_tickets: 'Tickets', tab_chat: 'Chat',

  asset_add: '+ Add Asset',
  col_name: 'Name', col_type: 'Type', col_provider: 'Provider', col_renewal: 'Renewal',
  col_cost: 'Cost', col_managed_by: 'Managed By', col_actions: '',
  f_name: 'Name', f_type: 'Type', f_provider: 'Provider', f_renewal: 'Renewal Date',
  f_cost: 'Cost', f_currency: 'Currency', f_notes: 'Notes', f_managed_by: 'Managed By',
  type_domain: 'Domain', type_hosting: 'Hosting', type_subscription: 'Subscription',
  type_tool: 'Tool', type_other: 'Other',
  asset_empty: 'No assets yet.',
  asset_delete_confirm: 'Delete this asset?',
  renewal_soon: 'Renews soon', renewal_overdue: 'Overdue',

  equipment_add: '+ Add Equipment',
  col_item: 'Item', col_category: 'Category', col_assigned: 'Assigned To',
  col_serial: 'Serial', col_status: 'Status',
  f_item_name: 'Item Name', f_category: 'Category', f_assigned_to: 'Assigned To',
  f_serial: 'Serial Number', f_status: 'Status',
  category_laptop: 'Laptop', category_phone: 'Phone', category_peripheral: 'Peripheral', category_other: 'Other',
  status_in_use: 'In Use', status_spare: 'Spare', status_repair: 'Repair', status_retired: 'Retired',
  equipment_empty: 'No equipment tracked yet.',
  equipment_delete_confirm: 'Delete this equipment record?',
  filter_all_status: 'All Statuses', filter_all_assignee: 'All People', unassigned: 'Unassigned',

  filter_all_tickets: 'All Statuses',
  col_subject: 'Subject', col_requester: 'Requester', col_priority: 'Priority', col_updated: 'Updated',
  ticket_empty: 'No tickets.',
  ticket_select_hint: 'Select a ticket to view it.',
  status_open: 'Open', status_in_progress: 'In Progress', status_resolved: 'Resolved', status_closed: 'Closed',
  assigned_to_label: 'Assigned to',
  comment_placeholder: 'Add a comment…', comment_send: 'Send',
  no_comments: 'No comments yet.',

  chat_empty: 'No conversations yet.',
  chat_select_hint: 'Select a conversation to view it.',
  chat_placeholder: 'Type a message…', chat_send: 'Send',

  save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete',
},
ar: {
  it_title: '◆ تقنية المعلومات',
  back_to_crm: '→ العودة إلى CRM',
  lang_switch: 'English',
  loading: 'جارٍ التحميل…',
  tab_assets: 'الأصول', tab_equipment: 'المعدات', tab_tickets: 'التذاكر', tab_chat: 'الدردشة',

  asset_add: '+ إضافة أصل',
  col_name: 'الاسم', col_type: 'النوع', col_provider: 'المزود', col_renewal: 'التجديد',
  col_cost: 'التكلفة', col_managed_by: 'المسؤول', col_actions: '',
  f_name: 'الاسم', f_type: 'النوع', f_provider: 'المزود', f_renewal: 'تاريخ التجديد',
  f_cost: 'التكلفة', f_currency: 'العملة', f_notes: 'ملاحظات', f_managed_by: 'المسؤول',
  type_domain: 'نطاق', type_hosting: 'استضافة', type_subscription: 'اشتراك',
  type_tool: 'أداة', type_other: 'أخرى',
  asset_empty: 'لا توجد أصول بعد.',
  asset_delete_confirm: 'حذف هذا الأصل؟',
  renewal_soon: 'يقترب التجديد', renewal_overdue: 'متأخر',

  equipment_add: '+ إضافة معدة',
  col_item: 'العنصر', col_category: 'الفئة', col_assigned: 'المسؤول عنه',
  col_serial: 'الرقم التسلسلي', col_status: 'الحالة',
  f_item_name: 'اسم العنصر', f_category: 'الفئة', f_assigned_to: 'مخصص لـ',
  f_serial: 'الرقم التسلسلي', f_status: 'الحالة',
  category_laptop: 'لابتوب', category_phone: 'هاتف', category_peripheral: 'ملحقات', category_other: 'أخرى',
  status_in_use: 'قيد الاستخدام', status_spare: 'احتياطي', status_repair: 'صيانة', status_retired: 'خارج الخدمة',
  equipment_empty: 'لا توجد معدات مسجلة بعد.',
  equipment_delete_confirm: 'حذف سجل هذه المعدة؟',
  filter_all_status: 'كل الحالات', filter_all_assignee: 'كل الأشخاص', unassigned: 'غير مخصص',

  filter_all_tickets: 'كل الحالات',
  col_subject: 'الموضوع', col_requester: 'مقدم الطلب', col_priority: 'الأولوية', col_updated: 'آخر تحديث',
  ticket_empty: 'لا توجد تذاكر.',
  ticket_select_hint: 'اختر تذكرة لعرضها.',
  status_open: 'مفتوحة', status_in_progress: 'قيد المعالجة', status_resolved: 'محلولة', status_closed: 'مغلقة',
  assigned_to_label: 'مسندة إلى',
  comment_placeholder: 'أضف تعليقاً…', comment_send: 'إرسال',
  no_comments: 'لا توجد تعليقات بعد.',

  chat_empty: 'لا توجد محادثات بعد.',
  chat_select_hint: 'اختر محادثة لعرضها.',
  chat_placeholder: 'اكتب رسالة…', chat_send: 'إرسال',

  save: 'حفظ', cancel: 'إلغاء', edit: 'تعديل', delete: 'حذف',
},
}

const ASSET_TYPES   = ['domain', 'hosting', 'subscription', 'tool', 'other']
const EQUIP_CATS     = ['laptop', 'phone', 'peripheral', 'other']
const EQUIP_STATUSES = ['in_use', 'spare', 'repair', 'retired']
const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed']
const TICKET_STATUS_BADGE = { open: 's1-badge', in_progress: 's2-badge', resolved: 's3-badge', closed: 's0-badge' }
const POLL_MS = 12000

let sb
let lang = localStorage.getItem('crm_lang') || 'en'
let activeTab = 'assets'
let me = null   // { id, role, full_name }

let profiles = []
let profileMap = {}
let assets = []
let equipment = []
let equipFilters = { status: '', assignee: '' }
let tickets = []
let ticketFilter = { status: '' }
let selectedTicketId = null
let ticketComments = []
let messages = []
let selectedConvId = null

const t   = key => T[lang][key] || key
const qs  = sel => document.querySelector(sel)
const qsa = sel => document.querySelectorAll(sel)
const today = () => new Date().toISOString().slice(0, 10)

function esc(str) {
  if (!str && str !== 0) return ''
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function applyLang() {
  const isAr = lang === 'ar'
  document.documentElement.lang = lang
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr'
  qs('#it-title').textContent    = t('it_title')
  qs('#btn-it-back').textContent = t('back_to_crm')
  qs('#btn-it-lang').textContent = t('lang_switch')
  qs('#it-tab-assets').textContent    = t('tab_assets')
  qs('#it-tab-equipment').textContent = t('tab_equipment')
  qs('#it-tab-tickets').textContent   = t('tab_tickets')
  qs('#it-tab-chat').textContent      = t('tab_chat')
}

async function init() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  applyLang()
  qs('#btn-it-lang').addEventListener('click', () => {
    lang = lang === 'en' ? 'ar' : 'en'
    localStorage.setItem('crm_lang', lang)
    applyLang()
    renderActiveTab()
  })
  qs('#it-tab-assets').addEventListener('click', () => switchTab('assets'))
  qs('#it-tab-equipment').addEventListener('click', () => switchTab('equipment'))
  qs('#it-tab-tickets').addEventListener('click', () => switchTab('tickets'))
  qs('#it-tab-chat').addEventListener('click', () => switchTab('chat'))

  qs('#it-status').textContent = t('loading')

  const { data: { session } } = await sb.auth.getSession()
  if (!session) { window.location.href = 'index.html'; return }

  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single()
  if (error || !profile || (profile.role !== 'it' && profile.role !== 'owner')) {
    window.location.href = 'index.html'
    return
  }
  me = { id: session.user.id, role: profile.role, full_name: profile.full_name }

  qs('#it-status').classList.add('hidden')
  qs('#it-body').classList.remove('hidden')

  await Promise.all([loadProfiles(), loadAssets(), loadEquipment(), loadTickets(), loadMessages()])
  renderActiveTab()

  setInterval(pollActiveTab, POLL_MS)
}

async function pollActiveTab() {
  if (activeTab === 'tickets') {
    await loadTickets()
    if (selectedTicketId) await loadComments(selectedTicketId)
    renderTickets()
  } else if (activeTab === 'chat') {
    await loadMessages()
    renderChat()
  }
}

function switchTab(tab) {
  activeTab = tab
  ;['assets','equipment','tickets','chat'].forEach(name => {
    qs(`#it-tab-${name}`).classList.toggle('active', name === tab)
    qs(`#it-${name}`).classList.toggle('hidden', name !== tab)
  })
  renderActiveTab()
}

function renderActiveTab() {
  if (activeTab === 'assets') renderAssets()
  else if (activeTab === 'equipment') renderEquipment()
  else if (activeTab === 'tickets') renderTickets()
  else renderChat()
}

// ── Data ──────────────────────────────────────────────────────────────────────
async function loadProfiles() {
  const { data } = await sb.from('profiles').select('*').order('full_name')
  profiles = data || []
  profileMap = {}
  profiles.forEach(p => { profileMap[p.id] = p })
}

async function loadAssets() {
  const { data, error } = await sb.from('it_assets').select('*').order('renewal_date', { ascending: true, nullsFirst: false })
  if (error) { assets = []; return }
  assets = data || []
}

async function loadEquipment() {
  const { data, error } = await sb.from('it_equipment').select('*').order('created_at', { ascending: false })
  if (error) { equipment = []; return }
  equipment = data || []
}

async function loadTickets() {
  const { data, error } = await sb.from('it_tickets').select('*').order('updated_at', { ascending: false })
  if (error) { tickets = []; return }
  tickets = data || []
}

async function loadComments(ticketId) {
  const { data, error } = await sb.from('it_ticket_comments').select('*').eq('ticket_id', ticketId).order('created_at')
  ticketComments = error ? [] : (data || [])
}

async function loadMessages() {
  const { data, error } = await sb.from('it_messages').select('*').order('created_at')
  if (error) { messages = []; return }
  messages = data || []
}

// ── Assets tab ────────────────────────────────────────────────────────────────
function renderAssets(editingId) {
  const wrap = qs('#it-assets')
  const editing = editingId !== undefined ? (assets.find(x => x.id === editingId) || {}) : null
  const tod = today()
  const soonCutoff = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const rowsHtml = assets.length ? assets.map(a => {
    let renewalCls = ''
    let renewalTxt = a.renewal_date || '—'
    if (a.renewal_date) {
      if (a.renewal_date < tod) { renewalCls = 'it-asset-overdue'; renewalTxt += ` (${t('renewal_overdue')})` }
      else if (a.renewal_date <= soonCutoff) { renewalCls = 'it-asset-soon'; renewalTxt += ` (${t('renewal_soon')})` }
    }
    return `
    <tr data-id="${a.id}">
      <td>${esc(a.name)}</td>
      <td>${esc(t('type_' + a.type))}</td>
      <td>${esc(a.provider || '')}</td>
      <td class="${renewalCls}">${esc(renewalTxt)}</td>
      <td>${a.cost != null ? Number(a.cost).toFixed(2) + ' ' + esc(a.currency || '') : ''}</td>
      <td>${esc(profileMap[a.managed_by]?.full_name || '')}</td>
      <td class="it-row-actions">
        <button data-act="edit">${t('edit')}</button>
        <button data-act="delete">${t('delete')}</button>
      </td>
    </tr>`
  }).join('') : `<tr><td colspan="7" class="field-hint">${t('asset_empty')}</td></tr>`

  const staff = profiles.filter(p => p.role === 'it' || p.role === 'owner')

  wrap.innerHTML = `
    <div class="db-client-table-wrap">
      <table class="db-client-table">
        <thead><tr>
          <th>${t('col_name')}</th><th>${t('col_type')}</th><th>${t('col_provider')}</th>
          <th>${t('col_renewal')}</th><th>${t('col_cost')}</th><th>${t('col_managed_by')}</th><th>${t('col_actions')}</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <button class="btn-ghost" id="btn-asset-new" style="width:auto;padding:8px 14px;">${t('asset_add')}</button>
    <div id="asset-form" class="field-group hidden" style="margin-top:16px;">
      <label class="field-label">${t('f_name')}</label>
      <input class="field-input" id="as-name" value="${esc(editing?.name || '')}" />
      <label class="field-label">${t('f_type')}</label>
      <select class="field-select" id="as-type">
        ${ASSET_TYPES.map(ty => `<option value="${ty}"${editing?.type === ty ? ' selected' : ''}>${t('type_' + ty)}</option>`).join('')}
      </select>
      <label class="field-label">${t('f_provider')}</label>
      <input class="field-input" id="as-provider" value="${esc(editing?.provider || '')}" />
      <label class="field-label">${t('f_renewal')}</label>
      <input class="field-input" id="as-renewal" type="date" value="${esc(editing?.renewal_date || '')}" />
      <label class="field-label">${t('f_cost')}</label>
      <input class="field-input" id="as-cost" type="number" step="0.01" value="${esc(editing?.cost ?? '')}" />
      <label class="field-label">${t('f_currency')}</label>
      <input class="field-input" id="as-currency" value="${esc(editing?.currency || 'USD')}" />
      <label class="field-label">${t('f_managed_by')}</label>
      <select class="field-select" id="as-managed-by">
        ${staff.map(p => `<option value="${p.id}"${(editing?.managed_by || me.id) === p.id ? ' selected' : ''}>${esc(p.full_name)}</option>`).join('')}
      </select>
      <label class="field-label">${t('f_notes')}</label>
      <textarea class="field-textarea" id="as-notes">${esc(editing?.notes || '')}</textarea>
      <div class="modal-footer">
        <button class="btn-primary" id="btn-asset-save">${t('save')}</button>
        <button class="btn-ghost" id="btn-asset-cancel">${t('cancel')}</button>
      </div>
    </div>
  `

  const form = qs('#asset-form')
  if (editing !== null) form.classList.remove('hidden')

  qs('#btn-asset-new').addEventListener('click', () => renderAssets(null))
  qs('#btn-asset-cancel')?.addEventListener('click', () => renderAssets())

  qs('#btn-asset-save')?.addEventListener('click', async () => {
    const payload = {
      name:         qs('#as-name').value.trim(),
      type:         qs('#as-type').value,
      provider:     qs('#as-provider').value.trim() || null,
      renewal_date: qs('#as-renewal').value || null,
      cost:         qs('#as-cost').value === '' ? null : parseFloat(qs('#as-cost').value),
      currency:     qs('#as-currency').value.trim() || null,
      managed_by:   qs('#as-managed-by').value,
      notes:        qs('#as-notes').value.trim() || null,
    }
    if (!payload.name) return
    const id = editing?.id
    const { error } = id
      ? await sb.from('it_assets').update(payload).eq('id', id)
      : await sb.from('it_assets').insert(payload)
    if (error) { alert('Error: ' + error.message); return }
    await loadAssets()
    renderAssets()
  })

  qsa('#it-assets tbody tr[data-id]').forEach(row => {
    const id = row.dataset.id
    row.querySelector('[data-act="edit"]').addEventListener('click', () => renderAssets(id))
    row.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      if (!confirm(t('asset_delete_confirm'))) return
      const { error } = await sb.from('it_assets').delete().eq('id', id)
      if (error) { alert('Error: ' + error.message); return }
      await loadAssets()
      renderAssets()
    })
  })
}

// ── Equipment tab ─────────────────────────────────────────────────────────────
function filteredEquipment() {
  return equipment.filter(e => {
    if (equipFilters.status   && e.status !== equipFilters.status) return false
    if (equipFilters.assignee && e.assigned_to !== equipFilters.assignee) return false
    return true
  })
}

function renderEquipment(editingId) {
  const wrap = qs('#it-equipment')
  const editing = editingId !== undefined ? (equipment.find(x => x.id === editingId) || {}) : null
  const data = filteredEquipment()

  const rowsHtml = data.length ? data.map(e => `
    <tr data-id="${e.id}">
      <td>${esc(e.item_name)}</td>
      <td>${esc(t('category_' + e.category))}</td>
      <td>${esc(profileMap[e.assigned_to]?.full_name || t('unassigned'))}</td>
      <td>${esc(e.serial_number || '')}</td>
      <td>${esc(t('status_' + e.status))}</td>
      <td class="it-row-actions">
        <button data-act="edit">${t('edit')}</button>
        <button data-act="delete">${t('delete')}</button>
      </td>
    </tr>`).join('') : `<tr><td colspan="6" class="field-hint">${t('equipment_empty')}</td></tr>`

  wrap.innerHTML = `
    <div class="it-filters">
      <select class="filter-select" id="eq-filter-status">
        <option value="">${t('filter_all_status')}</option>
        ${EQUIP_STATUSES.map(s => `<option value="${s}">${t('status_' + s)}</option>`).join('')}
      </select>
      <select class="filter-select" id="eq-filter-assignee">
        <option value="">${t('filter_all_assignee')}</option>
        ${profiles.map(p => `<option value="${p.id}">${esc(p.full_name)}</option>`).join('')}
      </select>
    </div>
    <div class="db-client-table-wrap">
      <table class="db-client-table">
        <thead><tr>
          <th>${t('col_item')}</th><th>${t('col_category')}</th><th>${t('col_assigned')}</th>
          <th>${t('col_serial')}</th><th>${t('col_status')}</th><th>${t('col_actions')}</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <button class="btn-ghost" id="btn-equipment-new" style="width:auto;padding:8px 14px;">${t('equipment_add')}</button>
    <div id="equipment-form" class="field-group hidden" style="margin-top:16px;">
      <label class="field-label">${t('f_item_name')}</label>
      <input class="field-input" id="eq-item-name" value="${esc(editing?.item_name || '')}" />
      <label class="field-label">${t('f_category')}</label>
      <select class="field-select" id="eq-category">
        ${EQUIP_CATS.map(c => `<option value="${c}"${editing?.category === c ? ' selected' : ''}>${t('category_' + c)}</option>`).join('')}
      </select>
      <label class="field-label">${t('f_assigned_to')}</label>
      <select class="field-select" id="eq-assigned-to">
        <option value="">${t('unassigned')}</option>
        ${profiles.map(p => `<option value="${p.id}"${editing?.assigned_to === p.id ? ' selected' : ''}>${esc(p.full_name)}</option>`).join('')}
      </select>
      <label class="field-label">${t('f_serial')}</label>
      <input class="field-input" id="eq-serial" value="${esc(editing?.serial_number || '')}" />
      <label class="field-label">${t('f_status')}</label>
      <select class="field-select" id="eq-status">
        ${EQUIP_STATUSES.map(s => `<option value="${s}"${(editing?.status || 'in_use') === s ? ' selected' : ''}>${t('status_' + s)}</option>`).join('')}
      </select>
      <label class="field-label">${t('f_notes')}</label>
      <textarea class="field-textarea" id="eq-notes">${esc(editing?.notes || '')}</textarea>
      <div class="modal-footer">
        <button class="btn-primary" id="btn-equipment-save">${t('save')}</button>
        <button class="btn-ghost" id="btn-equipment-cancel">${t('cancel')}</button>
      </div>
    </div>
  `

  qs('#eq-filter-status').value   = equipFilters.status
  qs('#eq-filter-assignee').value = equipFilters.assignee
  qs('#eq-filter-status').onchange   = e => { equipFilters.status = e.target.value; renderEquipment() }
  qs('#eq-filter-assignee').onchange = e => { equipFilters.assignee = e.target.value; renderEquipment() }

  const form = qs('#equipment-form')
  if (editing !== null) form.classList.remove('hidden')

  qs('#btn-equipment-new').addEventListener('click', () => renderEquipment(null))
  qs('#btn-equipment-cancel')?.addEventListener('click', () => renderEquipment())

  qs('#btn-equipment-save')?.addEventListener('click', async () => {
    const payload = {
      item_name:     qs('#eq-item-name').value.trim(),
      category:      qs('#eq-category').value,
      assigned_to:   qs('#eq-assigned-to').value || null,
      serial_number: qs('#eq-serial').value.trim() || null,
      status:        qs('#eq-status').value,
      notes:         qs('#eq-notes').value.trim() || null,
    }
    if (!payload.item_name) return
    const id = editing?.id
    const { error } = id
      ? await sb.from('it_equipment').update(payload).eq('id', id)
      : await sb.from('it_equipment').insert(payload)
    if (error) { alert('Error: ' + error.message); return }
    await loadEquipment()
    renderEquipment()
  })

  qsa('#it-equipment tbody tr[data-id]').forEach(row => {
    const id = row.dataset.id
    row.querySelector('[data-act="edit"]').addEventListener('click', () => renderEquipment(id))
    row.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      if (!confirm(t('equipment_delete_confirm'))) return
      const { error } = await sb.from('it_equipment').delete().eq('id', id)
      if (error) { alert('Error: ' + error.message); return }
      await loadEquipment()
      renderEquipment()
    })
  })
}

// ── Tickets tab ───────────────────────────────────────────────────────────────
function filteredTickets() {
  return tickets.filter(tk => !ticketFilter.status || tk.status === ticketFilter.status)
}

function renderTickets() {
  const wrap = qs('#it-tickets')
  const data = filteredTickets()
  const draft = qs('#it-comment-input')?.value || ''

  const listHtml = data.length ? data.map(tk => `
    <div class="it-list-item${selectedTicketId === tk.id ? ' selected' : ''}" data-id="${tk.id}">
      <div class="it-list-item-title">${esc(tk.subject)}</div>
      <div class="it-list-item-meta">
        <span class="status-badge ${TICKET_STATUS_BADGE[tk.status]}">${esc(t('status_' + tk.status))}</span>
        ${esc(profileMap[tk.created_by]?.full_name || '')}
      </div>
    </div>
  `).join('') : `<div class="it-empty">${t('ticket_empty')}</div>`

  wrap.innerHTML = `
    <div class="it-filters">
      <select class="filter-select" id="tk-filter-status">
        <option value="">${t('filter_all_tickets')}</option>
        ${TICKET_STATUSES.map(s => `<option value="${s}">${t('status_' + s)}</option>`).join('')}
      </select>
    </div>
    <div class="it-panes">
      <div class="it-pane-list" id="it-tickets-list">${listHtml}</div>
      <div class="it-pane-detail" id="it-tickets-detail"></div>
    </div>
  `

  qs('#tk-filter-status').value = ticketFilter.status
  qs('#tk-filter-status').onchange = e => { ticketFilter.status = e.target.value; renderTickets() }

  qsa('#it-tickets-list .it-list-item[data-id]').forEach(item => {
    item.addEventListener('click', async () => {
      selectedTicketId = item.dataset.id
      await loadComments(selectedTicketId)
      renderTickets()
    })
  })

  renderTicketDetail(draft)
}

function renderTicketDetail(draft) {
  const detail = qs('#it-tickets-detail')
  const tk = tickets.find(x => x.id === selectedTicketId)
  if (!tk) { detail.innerHTML = `<div class="it-empty">${t('ticket_select_hint')}</div>`; return }

  const commentsHtml = ticketComments.length
    ? ticketComments.map(c => `
      <div class="it-comment">
        <div class="it-comment-meta">${esc(profileMap[c.author_id]?.full_name || '')} · ${esc((c.created_at || '').slice(0,16).replace('T',' '))}</div>
        <div class="it-comment-body">${esc(c.body)}</div>
      </div>`).join('')
    : `<div class="field-hint">${t('no_comments')}</div>`

  detail.innerHTML = `
    <div class="it-ticket-header">
      <span class="it-ticket-title">${esc(tk.subject)}</span>
    </div>
    <div class="it-ticket-meta">${esc(t('col_requester'))}: ${esc(profileMap[tk.created_by]?.full_name || '')} · ${esc((tk.created_at||'').slice(0,16).replace('T',' '))}</div>
    <div class="it-ticket-desc">${esc(tk.description || '')}</div>
    <div class="it-ticket-controls">
      <select class="field-select" id="tk-status-select">
        ${TICKET_STATUSES.map(s => `<option value="${s}"${tk.status === s ? ' selected' : ''}>${t('status_' + s)}</option>`).join('')}
      </select>
      <select class="field-select" id="tk-assignee-select">
        <option value="">${t('unassigned')}</option>
        ${profiles.filter(p => p.role === 'it' || p.role === 'owner').map(p => `<option value="${p.id}"${tk.assigned_to === p.id ? ' selected' : ''}>${esc(p.full_name)}</option>`).join('')}
      </select>
    </div>
    <div class="it-thread">${commentsHtml}</div>
    <div class="it-compose-row">
      <textarea class="field-textarea" id="it-comment-input" placeholder="${t('comment_placeholder')}">${esc(draft || '')}</textarea>
      <button class="btn-primary" id="btn-comment-send">${t('comment_send')}</button>
    </div>
  `

  qs('#tk-status-select').addEventListener('change', async e => {
    await sb.from('it_tickets').update({ status: e.target.value }).eq('id', tk.id)
    await loadTickets()
    renderTickets()
  })
  qs('#tk-assignee-select').addEventListener('change', async e => {
    await sb.from('it_tickets').update({ assigned_to: e.target.value || null }).eq('id', tk.id)
    await loadTickets()
    renderTickets()
  })

  qs('#btn-comment-send').addEventListener('click', async () => {
    const body = qs('#it-comment-input').value.trim()
    if (!body) return
    const { error } = await sb.from('it_ticket_comments').insert({ ticket_id: tk.id, body })
    if (error) { alert('Error: ' + error.message); return }
    await loadComments(tk.id)
    renderTickets()
  })
}

// ── Chat tab ──────────────────────────────────────────────────────────────────
function isStaff(profileId) {
  const role = profileMap[profileId]?.role
  return role === 'it' || role === 'owner'
}

function conversations() {
  const byCounterpart = {}
  messages.forEach(m => {
    const counterpart = isStaff(m.sender_id) ? m.recipient_id : m.sender_id
    if (!byCounterpart[counterpart]) byCounterpart[counterpart] = []
    byCounterpart[counterpart].push(m)
  })
  return Object.entries(byCounterpart).map(([id, msgs]) => {
    msgs.sort((a, b) => a.created_at.localeCompare(b.created_at))
    const last = msgs[msgs.length - 1]
    const unread = msgs.some(m => m.recipient_id === me.id && !m.read_at)
    return { id, msgs, last, unread }
  }).sort((a, b) => b.last.created_at.localeCompare(a.last.created_at))
}

function renderChat() {
  const wrap = qs('#it-chat')
  const draft = qs('#it-chat-input')?.value || ''
  const convs = conversations()

  const listHtml = convs.length ? convs.map(c => `
    <div class="it-list-item${selectedConvId === c.id ? ' selected' : ''}" data-id="${c.id}">
      <div class="it-list-item-title">${esc(profileMap[c.id]?.full_name || '?')}</div>
      <div class="it-list-item-meta">
        ${c.unread ? '<span class="it-unread-dot"></span>' : ''}
        <span>${esc((c.last.body || '').slice(0, 40))}</span>
      </div>
    </div>
  `).join('') : `<div class="it-empty">${t('chat_empty')}</div>`

  wrap.innerHTML = `
    <div class="it-panes">
      <div class="it-pane-list" id="it-chat-list">${listHtml}</div>
      <div class="it-pane-detail" id="it-chat-detail"></div>
    </div>
  `

  qsa('#it-chat-list .it-list-item[data-id]').forEach(item => {
    item.addEventListener('click', async () => {
      selectedConvId = item.dataset.id
      await markConvRead(selectedConvId)
      renderChat()
    })
  })

  renderChatDetail(draft)
}

async function markConvRead(counterpartId) {
  const unreadIds = messages
    .filter(m => m.sender_id === counterpartId && m.recipient_id === me.id && !m.read_at)
    .map(m => m.id)
  if (!unreadIds.length) return
  await sb.from('it_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
  await loadMessages()
}

function renderChatDetail(draft) {
  const detail = qs('#it-chat-detail')
  const conv = conversations().find(c => c.id === selectedConvId)
  if (!conv) { detail.innerHTML = `<div class="it-empty">${t('chat_select_hint')}</div>`; return }

  const msgsHtml = conv.msgs.map(m => `
    <div class="it-chat-msg ${m.sender_id === me.id ? 'mine' : 'theirs'}">
      ${esc(m.body)}
      <div class="it-chat-time">${esc((m.created_at || '').slice(0,16).replace('T',' '))}</div>
    </div>
  `).join('')

  detail.innerHTML = `
    <div class="it-ticket-header">
      <span class="it-ticket-title">${esc(profileMap[conv.id]?.full_name || '?')}</span>
    </div>
    <div class="it-thread">${msgsHtml}</div>
    <div class="it-compose-row">
      <textarea class="field-textarea" id="it-chat-input" placeholder="${t('chat_placeholder')}">${esc(draft || '')}</textarea>
      <button class="btn-primary" id="btn-chat-send">${t('chat_send')}</button>
    </div>
  `

  const threadEl = qs('.it-thread')
  if (threadEl) threadEl.scrollTop = threadEl.scrollHeight

  qs('#btn-chat-send').addEventListener('click', async () => {
    const body = qs('#it-chat-input').value.trim()
    if (!body) return
    const { error } = await sb.from('it_messages').insert({ sender_id: me.id, recipient_id: conv.id, body })
    if (error) { alert('Error: ' + error.message); return }
    await loadMessages()
    renderChat()
  })
}

document.addEventListener('DOMContentLoaded', init)
