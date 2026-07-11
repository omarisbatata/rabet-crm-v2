// Get IT Help — standalone page, open to any signed-in team member
// regardless of role (that's the point: it's the self-service side of the
// IT module, mirrored against it.html which is the it/owner admin side).
// Shares the Supabase auth session via localStorage.

const T = {
en: {
  ith_title: '◆ Get IT Help',
  back_to_crm: '← Back to CRM',
  lang_switch: 'العربية',
  loading: 'Loading…',
  tab_tickets: 'My Tickets', tab_chat: 'Message IT', tab_equipment: 'My Equipment',

  ticket_new: '+ New Ticket',
  f_subject: 'Subject', f_description: 'Description', f_priority: 'Priority (optional)',
  col_subject: 'Subject', col_status: 'Status', col_updated: 'Updated',
  ticket_empty: 'You have no tickets yet.',
  ticket_select_hint: 'Select a ticket to view it.',
  status_open: 'Open', status_in_progress: 'In Progress', status_resolved: 'Resolved', status_closed: 'Closed',
  comment_placeholder: 'Add a comment…', comment_send: 'Send',
  no_comments: 'No comments yet.',

  chat_placeholder: 'Type a message…', chat_send: 'Send',
  no_it_contact: 'No IT contact has been set up yet — check back later.',
  chat_empty: 'No messages yet — say hi.',

  col_item: 'Item', col_category: 'Category', col_serial: 'Serial', col_status_eq: 'Status',
  category_laptop: 'Laptop', category_phone: 'Phone', category_peripheral: 'Peripheral', category_other: 'Other',
  status_in_use: 'In Use', status_spare: 'Spare', status_repair: 'Repair', status_retired: 'Retired',
  equipment_empty: 'No equipment assigned to you.',

  save: 'Save', cancel: 'Cancel',
},
ar: {
  ith_title: '◆ طلب مساعدة تقنية',
  back_to_crm: '→ العودة إلى CRM',
  lang_switch: 'English',
  loading: 'جارٍ التحميل…',
  tab_tickets: 'تذاكري', tab_chat: 'مراسلة تقنية المعلومات', tab_equipment: 'معداتي',

  ticket_new: '+ تذكرة جديدة',
  f_subject: 'الموضوع', f_description: 'الوصف', f_priority: 'الأولوية (اختياري)',
  col_subject: 'الموضوع', col_status: 'الحالة', col_updated: 'آخر تحديث',
  ticket_empty: 'لا توجد تذاكر بعد.',
  ticket_select_hint: 'اختر تذكرة لعرضها.',
  status_open: 'مفتوحة', status_in_progress: 'قيد المعالجة', status_resolved: 'محلولة', status_closed: 'مغلقة',
  comment_placeholder: 'أضف تعليقاً…', comment_send: 'إرسال',
  no_comments: 'لا توجد تعليقات بعد.',

  chat_placeholder: 'اكتب رسالة…', chat_send: 'إرسال',
  no_it_contact: 'لم يتم تعيين مسؤول تقنية معلومات بعد — راجع لاحقاً.',
  chat_empty: 'لا توجد رسائل بعد — ابدأ المحادثة.',

  col_item: 'العنصر', col_category: 'الفئة', col_serial: 'الرقم التسلسلي', col_status_eq: 'الحالة',
  category_laptop: 'لابتوب', category_phone: 'هاتف', category_peripheral: 'ملحقات', category_other: 'أخرى',
  status_in_use: 'قيد الاستخدام', status_spare: 'احتياطي', status_repair: 'صيانة', status_retired: 'خارج الخدمة',
  equipment_empty: 'لا توجد معدات مخصصة لك.',

  save: 'حفظ', cancel: 'إلغاء',
},
}

const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed']
const TICKET_STATUS_BADGE = { open: 's1-badge', in_progress: 's2-badge', resolved: 's3-badge', closed: 's0-badge' }
const POLL_MS = 12000

let sb
let lang = localStorage.getItem('crm_lang') || 'en'
let activeTab = 'tickets'
let me = null
let profileMap = {}
let itContactId = null

let myTickets = []
let selectedTicketId = null
let ticketComments = []
let myMessages = []
let myEquipment = []

const t   = key => T[lang][key] || key
const qs  = sel => document.querySelector(sel)
const qsa = sel => document.querySelectorAll(sel)

function esc(str) {
  if (!str && str !== 0) return ''
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function applyLang() {
  const isAr = lang === 'ar'
  document.documentElement.lang = lang
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr'
  qs('#ith-title').textContent    = t('ith_title')
  qs('#btn-ith-back').textContent = t('back_to_crm')
  qs('#btn-ith-lang').textContent = t('lang_switch')
  qs('#ith-tab-tickets').textContent   = t('tab_tickets')
  qs('#ith-tab-chat').textContent      = t('tab_chat')
  qs('#ith-tab-equipment').textContent = t('tab_equipment')
}

async function init() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  applyLang()
  qs('#btn-ith-lang').addEventListener('click', () => {
    lang = lang === 'en' ? 'ar' : 'en'
    localStorage.setItem('crm_lang', lang)
    applyLang()
    renderActiveTab()
  })
  qs('#ith-tab-tickets').addEventListener('click', () => switchTab('tickets'))
  qs('#ith-tab-chat').addEventListener('click', () => switchTab('chat'))
  qs('#ith-tab-equipment').addEventListener('click', () => switchTab('equipment'))

  qs('#ith-status').textContent = t('loading')

  const { data: { session } } = await sb.auth.getSession()
  if (!session) { window.location.href = 'index.html'; return }

  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single()
  if (error || !profile) { window.location.href = 'index.html'; return }
  me = { id: session.user.id, role: profile.role, full_name: profile.full_name }

  qs('#ith-status').classList.add('hidden')
  qs('#ith-body').classList.remove('hidden')

  await Promise.all([loadProfiles(), loadMyTickets(), loadMyMessages(), loadMyEquipment()])
  renderActiveTab()

  setInterval(pollActiveTab, POLL_MS)
}

async function pollActiveTab() {
  if (activeTab === 'tickets') {
    await loadMyTickets()
    if (selectedTicketId) await loadComments(selectedTicketId)
    renderTickets()
  } else if (activeTab === 'chat') {
    await loadMyMessages()
    renderChat()
  }
}

function switchTab(tab) {
  activeTab = tab
  ;['tickets','chat','equipment'].forEach(name => {
    qs(`#ith-tab-${name}`).classList.toggle('active', name === tab)
    qs(`#ith-${name}`).classList.toggle('hidden', name !== tab)
  })
  renderActiveTab()
}

function renderActiveTab() {
  if (activeTab === 'tickets') renderTickets()
  else if (activeTab === 'chat') renderChat()
  else renderEquipment()
}

// ── Data ──────────────────────────────────────────────────────────────────────
async function loadProfiles() {
  const { data } = await sb.from('profiles').select('*')
  profileMap = {}
  ;(data || []).forEach(p => { profileMap[p.id] = p })
  const itProfile = (data || []).find(p => p.role === 'it')
  itContactId = itProfile?.id || null
}

async function loadMyTickets() {
  const { data, error } = await sb.from('it_tickets').select('*').order('updated_at', { ascending: false })
  myTickets = error ? [] : (data || [])
}

async function loadComments(ticketId) {
  const { data, error } = await sb.from('it_ticket_comments').select('*').eq('ticket_id', ticketId).order('created_at')
  ticketComments = error ? [] : (data || [])
}

async function loadMyMessages() {
  const { data, error } = await sb.from('it_messages').select('*').order('created_at')
  myMessages = error ? [] : (data || [])
}

async function loadMyEquipment() {
  const { data, error } = await sb.from('it_equipment').select('*').eq('assigned_to', me.id)
  myEquipment = error ? [] : (data || [])
}

// ── My Tickets tab ────────────────────────────────────────────────────────────
function renderTickets() {
  const wrap = qs('#ith-tickets')
  const draft = qs('#ith-comment-input')?.value || ''

  const listHtml = myTickets.length ? myTickets.map(tk => `
    <div class="it-list-item${selectedTicketId === tk.id ? ' selected' : ''}" data-id="${tk.id}">
      <div class="it-list-item-title">${esc(tk.subject)}</div>
      <div class="it-list-item-meta">
        <span class="status-badge ${TICKET_STATUS_BADGE[tk.status]}">${esc(t('status_' + tk.status))}</span>
      </div>
    </div>
  `).join('') : `<div class="it-empty">${t('ticket_empty')}</div>`

  wrap.innerHTML = `
    <button class="btn-ghost" id="btn-ticket-new" style="width:auto;padding:8px 14px;margin-bottom:14px;">${t('ticket_new')}</button>
    <div id="ticket-new-form" class="field-group hidden">
      <label class="field-label">${t('f_subject')}</label>
      <input class="field-input" id="nt-subject" />
      <label class="field-label">${t('f_description')}</label>
      <textarea class="field-textarea" id="nt-description"></textarea>
      <label class="field-label">${t('f_priority')}</label>
      <input class="field-input" id="nt-priority" />
      <div class="modal-footer">
        <button class="btn-primary" id="btn-ticket-create">${t('save')}</button>
        <button class="btn-ghost" id="btn-ticket-new-cancel">${t('cancel')}</button>
      </div>
    </div>
    <div class="it-panes">
      <div class="it-pane-list" id="ith-tickets-list">${listHtml}</div>
      <div class="it-pane-detail" id="ith-tickets-detail"></div>
    </div>
  `

  qs('#btn-ticket-new').addEventListener('click', () => qs('#ticket-new-form').classList.toggle('hidden'))
  qs('#btn-ticket-new-cancel').addEventListener('click', () => qs('#ticket-new-form').classList.add('hidden'))
  qs('#btn-ticket-create').addEventListener('click', async () => {
    const subject = qs('#nt-subject').value.trim()
    if (!subject) return
    const payload = {
      subject,
      description: qs('#nt-description').value.trim() || null,
      priority:    qs('#nt-priority').value.trim() || null,
    }
    const { error } = await sb.from('it_tickets').insert(payload)
    if (error) { alert('Error: ' + error.message); return }
    qs('#ticket-new-form').classList.add('hidden')
    await loadMyTickets()
    renderTickets()
  })

  qsa('#ith-tickets-list .it-list-item[data-id]').forEach(item => {
    item.addEventListener('click', async () => {
      selectedTicketId = item.dataset.id
      await loadComments(selectedTicketId)
      renderTickets()
    })
  })

  renderTicketDetail(draft)
}

function renderTicketDetail(draft) {
  const detail = qs('#ith-tickets-detail')
  const tk = myTickets.find(x => x.id === selectedTicketId)
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
      <span class="status-badge ${TICKET_STATUS_BADGE[tk.status]}">${esc(t('status_' + tk.status))}</span>
    </div>
    <div class="it-ticket-desc">${esc(tk.description || '')}</div>
    <div class="it-thread">${commentsHtml}</div>
    <div class="it-compose-row">
      <textarea class="field-textarea" id="ith-comment-input" placeholder="${t('comment_placeholder')}">${esc(draft || '')}</textarea>
      <button class="btn-primary" id="btn-ith-comment-send">${t('comment_send')}</button>
    </div>
  `

  qs('#btn-ith-comment-send').addEventListener('click', async () => {
    const body = qs('#ith-comment-input').value.trim()
    if (!body) return
    const { error } = await sb.from('it_ticket_comments').insert({ ticket_id: tk.id, body })
    if (error) { alert('Error: ' + error.message); return }
    await loadComments(tk.id)
    renderTickets()
  })
}

// ── Message IT tab (single 1:1 thread with the IT contact) ──────────────────
function renderChat() {
  const wrap = qs('#ith-chat')
  const draft = qs('#ith-chat-input')?.value || ''

  if (!itContactId) {
    wrap.innerHTML = `<div class="it-empty">${t('no_it_contact')}</div>`
    return
  }

  const thread = myMessages
    .filter(m => (m.sender_id === me.id && m.recipient_id === itContactId) || (m.sender_id === itContactId && m.recipient_id === me.id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  const msgsHtml = thread.length
    ? thread.map(m => `
      <div class="it-chat-msg ${m.sender_id === me.id ? 'mine' : 'theirs'}">
        ${esc(m.body)}
        <div class="it-chat-time">${esc((m.created_at || '').slice(0,16).replace('T',' '))}</div>
      </div>`).join('')
    : `<div class="it-empty">${t('chat_empty')}</div>`

  wrap.innerHTML = `
    <div class="it-thread" id="ith-chat-thread">${msgsHtml}</div>
    <div class="it-compose-row">
      <textarea class="field-textarea" id="ith-chat-input" placeholder="${t('chat_placeholder')}">${esc(draft || '')}</textarea>
      <button class="btn-primary" id="btn-ith-chat-send">${t('chat_send')}</button>
    </div>
  `

  const threadEl = qs('#ith-chat-thread')
  if (threadEl) threadEl.scrollTop = threadEl.scrollHeight

  // Mark IT's messages as read now that the employee has opened the thread.
  const unreadIds = thread.filter(m => m.sender_id === itContactId && !m.read_at).map(m => m.id)
  if (unreadIds.length) sb.from('it_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds).then(() => loadMyMessages())

  qs('#btn-ith-chat-send').addEventListener('click', async () => {
    const body = qs('#ith-chat-input').value.trim()
    if (!body) return
    const { error } = await sb.from('it_messages').insert({ sender_id: me.id, recipient_id: itContactId, body })
    if (error) { alert('Error: ' + error.message); return }
    await loadMyMessages()
    renderChat()
  })
}

// ── My Equipment tab (read-only) ─────────────────────────────────────────────
function renderEquipment() {
  const wrap = qs('#ith-equipment')
  const rowsHtml = myEquipment.length ? myEquipment.map(e => `
    <tr>
      <td>${esc(e.item_name)}</td>
      <td>${esc(t('category_' + e.category))}</td>
      <td>${esc(e.serial_number || '')}</td>
      <td>${esc(t('status_' + e.status))}</td>
    </tr>
  `).join('') : `<tr><td colspan="4" class="field-hint">${t('equipment_empty')}</td></tr>`

  wrap.innerHTML = `
    <div class="db-client-table-wrap">
      <table class="db-client-table">
        <thead><tr>
          <th>${t('col_item')}</th><th>${t('col_category')}</th><th>${t('col_serial')}</th><th>${t('col_status_eq')}</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `
}

document.addEventListener('DOMContentLoaded', init)
