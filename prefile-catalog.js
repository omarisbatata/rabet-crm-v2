// Prefile Catalog admin page — standalone, owner-only, same redirect-gate
// pattern as it.html/finance.html/dashboard.html: this page has a real URL,
// so the redirect check in init() is the actual enforcement layer on top of
// RLS, not just a UI nicety. Shares the Supabase auth session via localStorage.
//
// This is the only place catalog content (audit issues/recommendations,
// price list tiers) is edited — Prefile's generator page just reads it.

const T = {
en: {
  pc_title: '📋 Prefile Catalog',
  back_to_crm: '← Back to CRM',
  lang_switch: 'العربية',
  loading: 'Loading…',
  tab_audit: 'Audit', tab_price_list: 'Price List',
  lane_web: 'Web & Product', lane_social: 'Social & Content', lane_video: 'Video & Production',
  cat_issue: 'Issues', cat_recommendation: 'Recommendations', cat_tier: 'Tiers',
  pc_add: '+ Add', pc_empty: 'Nothing here yet.',
  pc_f_title: 'Title', pc_f_body: 'Body', pc_f_price: 'Price (e.g. $150–250 or $60–120/mo)',
  pc_delete_confirm: 'Delete this catalog item?',
  save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete',
},
ar: {
  pc_title: '📋 كتالوج بريفايل',
  back_to_crm: '→ العودة إلى CRM',
  lang_switch: 'English',
  loading: 'جارٍ التحميل…',
  tab_audit: 'التدقيق', tab_price_list: 'قائمة الأسعار',
  lane_web: 'الويب والمنتج', lane_social: 'السوشال ميديا والمحتوى', lane_video: 'الفيديو والإنتاج',
  cat_issue: 'المشاكل', cat_recommendation: 'التوصيات', cat_tier: 'الباقات',
  pc_add: '+ إضافة', pc_empty: 'لا يوجد شيء هنا بعد.',
  pc_f_title: 'العنوان', pc_f_body: 'النص', pc_f_price: 'السعر (مثال: 150–250$ أو 60–120$/شهرياً)',
  pc_delete_confirm: 'حذف هذا العنصر من الكتالوج؟',
  save: 'حفظ', cancel: 'إلغاء', edit: 'تعديل', delete: 'حذف',
},
}

const LANES = ['web', 'social', 'video']

let sb
let lang = localStorage.getItem('crm_lang') || 'en'
let activeDocType = 'audit'
let catalog = []
let editing = null   // { id } for editing an existing row, or { lane, category, id: null } for a new row

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
  qs('#pc-title').textContent    = t('pc_title')
  qs('#btn-pc-back').textContent = t('back_to_crm')
  qs('#btn-pc-lang').textContent = t('lang_switch')
  qs('#pc-tab-audit').textContent      = t('tab_audit')
  qs('#pc-tab-price_list').textContent = t('tab_price_list')
}

async function init() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  applyLang()
  qs('#btn-pc-lang').addEventListener('click', () => {
    lang = lang === 'en' ? 'ar' : 'en'
    localStorage.setItem('crm_lang', lang)
    applyLang()
    renderCatalog()
  })
  qs('#pc-tab-audit').addEventListener('click', () => switchDocType('audit'))
  qs('#pc-tab-price_list').addEventListener('click', () => switchDocType('price_list'))

  qs('#pc-status').textContent = t('loading')

  const { data: { session } } = await sb.auth.getSession()
  if (!session) { window.location.href = 'index.html'; return }

  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single()
  if (error || !profile || profile.role !== 'owner') {
    window.location.href = 'index.html'
    return
  }

  qs('#pc-status').classList.add('hidden')
  qs('#pc-page-body').classList.remove('hidden')

  await loadCatalog()
  renderCatalog()
}

async function loadCatalog() {
  const { data, error } = await sb.from('prefile_catalog').select('*').order('sort_order')
  catalog = error ? [] : (data || [])
}

function switchDocType(docType) {
  activeDocType = docType
  editing = null
  qs('#pc-tab-audit').classList.toggle('active', docType === 'audit')
  qs('#pc-tab-price_list').classList.toggle('active', docType === 'price_list')
  renderCatalog()
}

// ── Render ────────────────────────────────────────────────────────────────

function catalogFormRowHtml(lane, category, item) {
  const showPrice = category === 'tier'
  return `
    <div class="pc-item-form">
      <input class="field-input" id="pc-f-title" placeholder="${t('pc_f_title')}" value="${esc(item?.title || '')}" />
      ${showPrice ? `<input class="field-input" id="pc-f-price" placeholder="${t('pc_f_price')}" value="${esc(item?.price || '')}" />` : ''}
      <textarea class="field-textarea" id="pc-f-body" placeholder="${t('pc_f_body')}">${esc(item?.body || '')}</textarea>
      <div class="modal-footer">
        <button class="btn-primary" id="pc-f-save" data-lane="${lane}" data-category="${category}" data-id="${item?.id || ''}">${t('save')}</button>
        <button class="btn-ghost" id="pc-f-cancel">${t('cancel')}</button>
      </div>
    </div>`
}

function renderCategoryBlock(lane, category) {
  const items = catalog
    .filter(r => r.doc_type === activeDocType && r.lane === lane && r.category === category)
    .sort((a, b) => a.sort_order - b.sort_order)
  const isEditingNew = editing && editing.id === null && editing.lane === lane && editing.category === category

  const rowsHtml = items.map((item, idx) => {
    if (editing && editing.id === item.id) return catalogFormRowHtml(lane, category, item)
    return `
      <div class="pc-item-row" data-id="${item.id}">
        <div class="pc-item-reorder">
          <button data-act="up" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button data-act="down" ${idx === items.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <div class="pc-item-content">
          <div class="pc-item-title">${esc(item.title)}${item.price ? ` <span class="pc-item-price">${esc(item.price)}</span>` : ''}</div>
          <div class="pc-item-body">${esc(item.body)}</div>
        </div>
        <div class="pc-item-actions">
          <button data-act="edit">${t('edit')}</button>
          <button data-act="delete">${t('delete')}</button>
        </div>
      </div>`
  }).join('')

  return `
    <div class="pc-category-block">
      <div class="pc-category-header">
        <span>${t('cat_' + category)}</span>
        <button class="btn-ghost pc-add-btn" data-lane="${lane}" data-category="${category}">${t('pc_add')}</button>
      </div>
      ${rowsHtml || `<div class="field-hint">${t('pc_empty')}</div>`}
      ${isEditingNew ? catalogFormRowHtml(lane, category, null) : ''}
    </div>`
}

function renderCatalog() {
  const categories = activeDocType === 'audit' ? ['issue', 'recommendation'] : ['tier']
  qs('#pc-body').innerHTML = LANES.map(lane => `
    <div class="pc-lane-card">
      <div class="pc-lane-title">${t('lane_' + lane)}</div>
      ${categories.map(cat => renderCategoryBlock(lane, cat)).join('')}
    </div>
  `).join('')
  wireCatalogEvents()
}

// ── Events ────────────────────────────────────────────────────────────────

function wireCatalogEvents() {
  qs('#pc-body').onclick = async e => {
    const addBtn = e.target.closest('.pc-add-btn')
    if (addBtn) { editing = { lane: addBtn.dataset.lane, category: addBtn.dataset.category, id: null }; renderCatalog(); return }

    if (e.target.closest('#pc-f-cancel')) { editing = null; renderCatalog(); return }

    const saveBtn = e.target.closest('#pc-f-save')
    if (saveBtn) { await handleSave(saveBtn); return }

    const row = e.target.closest('.pc-item-row')
    if (row) {
      const id = row.dataset.id
      const act = e.target.closest('button')?.dataset.act
      if (act === 'edit') { editing = { id }; renderCatalog(); return }
      if (act === 'delete') { await handleDelete(id); return }
      if (act === 'up' || act === 'down') { await reorderItem(id, act); return }
    }
  }
}

async function handleSave(saveBtn) {
  const title = qs('#pc-f-title').value.trim()
  const body  = qs('#pc-f-body').value.trim()
  const priceEl = qs('#pc-f-price')
  const price = priceEl ? (priceEl.value.trim() || null) : null
  if (!title) return

  const lane = saveBtn.dataset.lane
  const category = saveBtn.dataset.category
  const id = saveBtn.dataset.id

  if (id) {
    const { error } = await sb.from('prefile_catalog').update({ title, body, price }).eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
  } else {
    const siblings = catalog.filter(r => r.doc_type === activeDocType && r.lane === lane && r.category === category)
    const sort_order = siblings.length ? Math.max(...siblings.map(x => x.sort_order)) + 1 : 1
    const { error } = await sb.from('prefile_catalog').insert({ doc_type: activeDocType, lane, category, title, body, price, sort_order })
    if (error) { alert('Error: ' + error.message); return }
  }
  editing = null
  await loadCatalog()
  renderCatalog()
}

async function handleDelete(id) {
  if (!confirm(t('pc_delete_confirm'))) return
  const { error } = await sb.from('prefile_catalog').delete().eq('id', id)
  if (error) { alert('Error: ' + error.message); return }
  await loadCatalog()
  renderCatalog()
}

async function reorderItem(id, direction) {
  const item = catalog.find(r => r.id === id)
  if (!item) return
  const siblings = catalog
    .filter(r => r.doc_type === item.doc_type && r.lane === item.lane && r.category === item.category)
    .sort((a, b) => a.sort_order - b.sort_order)
  const idx = siblings.findIndex(r => r.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= siblings.length) return
  const other = siblings[swapIdx]

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    sb.from('prefile_catalog').update({ sort_order: other.sort_order }).eq('id', item.id),
    sb.from('prefile_catalog').update({ sort_order: item.sort_order }).eq('id', other.id),
  ])
  if (e1 || e2) { alert('Error: ' + (e1?.message || e2?.message)); return }
  await loadCatalog()
  renderCatalog()
}

document.addEventListener('DOMContentLoaded', init)
